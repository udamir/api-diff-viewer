/**
 * Inline View — Pure DOM single-editor view
 *
 * Creates a single CodeMirror editor showing unified diff content
 * with inline word-level diffs showing removed text as widgets.
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
  generateUnifiedContentFromDiff,
  type UnifiedResult,
} from '../sync/visual-alignment'
import {
  buildInlineWordDiffLines,
  setInlineWordDiffEffect,
} from '../extensions/inline-word-diff'

import { BaseView, type ViewConfig } from './base-view'

export class InlineView extends BaseView {
  private editorView: EditorView | null = null

  constructor(container: HTMLElement, config: ViewConfig) {
    super(container, config)
  }

  render(diffData: DiffData, format: 'json' | 'yaml'): void {
    this.destroyEditor()

    const showWordDiff = this.config.wordDiffMode !== 'none'

    // Generate unified content
    const unified: UnifiedResult = generateUnifiedContentFromDiff(
      diffData.blocks,
      format,
      { inlineWordDiff: showWordDiff }
    )

    const unifiedContent = unified.lines.join('\n')

    // Compute inline word diff data for modified lines
    const inlineWordDiffData =
      showWordDiff && unified.beforeContentMap
        ? buildInlineWordDiffLines(
            unified.lines,
            unified.lineMap,
            unified.beforeContentMap
          )
        : []

    // Create extensions
    const extensions = [
      ...this.createBaseExtensions(format, 'unified', unified.lineMap),
      ...this.createInlineWordDiffExtension(),
    ]

    // Create editor
    const state = EditorState.create({
      doc: unifiedContent,
      extensions,
    })

    this.editorView = new EditorView({
      state,
      parent: this.rootEl,
    })

    // Dispatch initial effects
    const effects: StateEffect<unknown>[] = [
      setSideEffect.of('unified'),
      setDiffDataEffect.of(diffData),
      setEditorSideEffect.of('unified'),
      setLineMappingsEffect.of(unified.lineMap),
      setWordDiffModeEffect.of(this.config.wordDiffMode),
    ]

    if (showWordDiff && inlineWordDiffData.length > 0) {
      effects.push(setInlineWordDiffEffect.of(inlineWordDiffData))
    }

    this.editorView.dispatch({ effects })
  }

  updateTheme(dark: boolean, colors?: Partial<DiffThemeColors>, baseTheme?: Extension): void {
    this.config.dark = dark
    if (colors) this.config.colors = colors
    if (baseTheme !== undefined) this.config.baseTheme = baseTheme

    if (this.editorView) {
      this.themeManager.setDiffTheme(this.editorView, { dark, colors })
    }
  }

  getEditorViews(): EditorView[] {
    return this.editorView ? [this.editorView] : []
  }

  setWordWrap(enabled: boolean): void {
    this.config.wordWrap = enabled
    if (this.editorView) this.reconfigureLineWrapping(this.editorView, enabled)
  }

  destroy(): void {
    this.destroyEditor()
    this.rootEl.remove()
  }

  private destroyEditor(): void {
    this.editorView?.destroy()
    this.editorView = null

    while (this.rootEl.firstChild) {
      this.rootEl.removeChild(this.rootEl.firstChild)
    }
  }
}
