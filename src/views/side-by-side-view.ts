/**
 * Side-by-Side View — Pure DOM dual-editor view
 *
 * Creates two synchronized CodeMirror editors showing before/after content
 * with aligned spacer lines, scroll sync, and optional fold sync.
 */

import { EditorState, Extension, StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import type { DiffData, DiffThemeColors } from '../types'
import {
  setDiffDataEffect,
  setSideEffect,
} from '../state/diff-state'
import {
  setLineMappingsEffect,
  setEditorSideEffect,
  setWordDiffModeEffect,
} from '../extensions/aligned-decorations'
import {
  generateAlignedContentFromDiff,
  type AlignmentResult,
} from '../sync/visual-alignment'
import { setupFoldSync } from '../sync/fold-sync'
import { setupHeightSync } from '../sync/height-sync'
import {
  buildWordDiffData,
  setWordDiffDataEffect,
} from '../extensions/word-diff'

import { BaseView, type ViewConfig } from './base-view'

export class SideBySideView extends BaseView {
  private beforeView: EditorView | null = null
  private afterView: EditorView | null = null
  private beforeContainer: HTMLElement | null = null
  private afterContainer: HTMLElement | null = null
  private scrollSyncCleanup: (() => void) | null = null
  private foldSyncCleanup: (() => void) | null = null
  private heightSyncCleanup: (() => void) | null = null

  constructor(container: HTMLElement, config: ViewConfig) {
    super(container, config)
  }

  render(diffData: DiffData, format: 'json' | 'yaml'): void {
    // Clean up any existing editors
    this.destroyEditors()

    // Create flex container
    this.rootEl.style.display = 'flex'

    this.beforeContainer = document.createElement('div')
    this.beforeContainer.className = 'cm-diff-side cm-diff-side-before'
    this.beforeContainer.style.flex = '1'
    this.beforeContainer.style.minWidth = '0'
    this.beforeContainer.style.height = '100%'
    this.beforeContainer.style.overflow = 'hidden'
    this.beforeContainer.style.borderRight = `1px solid ${this.config.dark ? '#30363d' : '#d0d7de'}`
    this.rootEl.appendChild(this.beforeContainer)

    this.afterContainer = document.createElement('div')
    this.afterContainer.className = 'cm-diff-side cm-diff-side-after'
    this.afterContainer.style.flex = '1'
    this.afterContainer.style.minWidth = '0'
    this.afterContainer.style.height = '100%'
    this.afterContainer.style.overflow = 'hidden'
    this.rootEl.appendChild(this.afterContainer)

    // Inject style to hide left scrollbar and theme the right scrollbar
    this.injectScrollStyles()

    // Generate aligned content
    const alignment: AlignmentResult = generateAlignedContentFromDiff(
      diffData.blocks,
      format,
      null,
      null,
      { wordDiffMode: this.config.wordDiffMode }
    )

    const alignedBeforeContent = alignment.beforeLines.join('\n')
    const alignedAfterContent = alignment.afterLines.join('\n')

    const showWordDiff = this.config.wordDiffMode !== 'none'

    // Pre-compute word diff data
    const diffMode = this.config.wordDiffMode === 'none' ? undefined : this.config.wordDiffMode

    const wordDiffDataBefore = showWordDiff
      ? buildWordDiffData(
          alignment.lineMap,
          alignment.beforeLines,
          alignment.afterLines,
          'before',
          diffMode
        )
      : []

    const wordDiffDataAfter = showWordDiff
      ? buildWordDiffData(
          alignment.lineMap,
          alignment.beforeLines,
          alignment.afterLines,
          'after',
          diffMode
        )
      : []

    // Create before editor
    const beforeExtensions = [
      ...this.createBaseExtensions(format, 'before', alignment.lineMap),
      ...this.createWordDiffExtension(),
    ]

    const beforeState = EditorState.create({
      doc: alignedBeforeContent,
      extensions: beforeExtensions,
    })

    this.beforeView = new EditorView({
      state: beforeState,
      parent: this.beforeContainer,
    })

    // Dispatch initial effects for before editor
    const beforeEffects: StateEffect<unknown>[] = [
      setSideEffect.of('before'),
      setDiffDataEffect.of(diffData),
      setEditorSideEffect.of('before'),
      setLineMappingsEffect.of(alignment.lineMap),
      setWordDiffModeEffect.of(this.config.wordDiffMode),
    ]

    if (showWordDiff && wordDiffDataBefore.length > 0) {
      beforeEffects.push(setWordDiffDataEffect.of(wordDiffDataBefore))
    }

    this.beforeView.dispatch({ effects: beforeEffects })

    // Create after editor
    const afterExtensions = [
      ...this.createBaseExtensions(format, 'after', alignment.lineMap),
      ...this.createWordDiffExtension(),
    ]

    const afterState = EditorState.create({
      doc: alignedAfterContent,
      extensions: afterExtensions,
    })

    this.afterView = new EditorView({
      state: afterState,
      parent: this.afterContainer,
    })

    // Dispatch initial effects for after editor
    const afterEffects: StateEffect<unknown>[] = [
      setSideEffect.of('after'),
      setDiffDataEffect.of(diffData),
      setEditorSideEffect.of('after'),
      setLineMappingsEffect.of(alignment.lineMap),
      setWordDiffModeEffect.of(this.config.wordDiffMode),
    ]

    if (showWordDiff && wordDiffDataAfter.length > 0) {
      afterEffects.push(setWordDiffDataEffect.of(wordDiffDataAfter))
    }

    this.afterView.dispatch({ effects: afterEffects })

    // Set up scroll sync
    this.scrollSyncCleanup = this.setupScrollSync(this.beforeView, this.afterView)

    // Set up fold sync if enabled
    if (this.config.enableFolding) {
      this.foldSyncCleanup = setupFoldSync(
        this.beforeView,
        this.afterView,
        alignment.lineMap
      )
    }

    // Set up height sync to equalize line heights across editors
    this.heightSyncCleanup = setupHeightSync(this.beforeView, this.afterView)

  }

  updateTheme(dark: boolean, colors?: Partial<DiffThemeColors>, baseTheme?: Extension): void {
    this.config.dark = dark
    if (colors) this.config.colors = colors
    if (baseTheme !== undefined) this.config.baseTheme = baseTheme

    const opts = { dark, colors }
    if (this.beforeView) {
      this.themeManager.setDiffTheme(this.beforeView, opts)
    }
    if (this.afterView) {
      this.themeManager.setDiffTheme(this.afterView, opts)
    }

    // Update divider color
    if (this.beforeContainer) {
      this.beforeContainer.style.borderRight = `1px solid ${dark ? '#30363d' : '#d0d7de'}`
    }
  }

  getEditorViews(): EditorView[] {
    const views: EditorView[] = []
    if (this.beforeView) views.push(this.beforeView)
    if (this.afterView) views.push(this.afterView)
    return views
  }

  destroy(): void {
    this.destroyEditors()
    this.rootEl.remove()
  }

  private injectScrollStyles(): void {
    // No-op: scrollbars are visible on both sides so users can scroll either panel.
    // Scroll positions are kept in sync via setupScrollSync().
  }

  private destroyEditors(): void {
    this.scrollSyncCleanup?.()
    this.scrollSyncCleanup = null
    this.foldSyncCleanup?.()
    this.foldSyncCleanup = null
    this.heightSyncCleanup?.()
    this.heightSyncCleanup = null
    this.beforeView?.destroy()
    this.beforeView = null
    this.afterView?.destroy()
    this.afterView = null

    // Clear containers
    while (this.rootEl.firstChild) {
      this.rootEl.removeChild(this.rootEl.firstChild)
    }
    this.beforeContainer = null
    this.afterContainer = null
  }

  setWordWrap(enabled: boolean): void {
    this.config.wordWrap = enabled
    if (this.beforeView) this.reconfigureLineWrapping(this.beforeView, enabled)
    if (this.afterView) this.reconfigureLineWrapping(this.afterView, enabled)
  }

  private setupScrollSync(beforeView: EditorView, afterView: EditorView): () => void {
    let syncEnabled = true

    const syncScroll = (source: EditorView, target: EditorView) => {
      if (!syncEnabled) return

      syncEnabled = false
      target.scrollDOM.scrollTop = source.scrollDOM.scrollTop

      requestAnimationFrame(() => {
        syncEnabled = true
      })
    }

    const beforeScrollHandler = () => syncScroll(beforeView, afterView)
    const afterScrollHandler = () => syncScroll(afterView, beforeView)

    beforeView.scrollDOM.addEventListener('scroll', beforeScrollHandler)
    afterView.scrollDOM.addEventListener('scroll', afterScrollHandler)

    return () => {
      beforeView.scrollDOM.removeEventListener('scroll', beforeScrollHandler)
      afterView.scrollDOM.removeEventListener('scroll', afterScrollHandler)
    }
  }
}
