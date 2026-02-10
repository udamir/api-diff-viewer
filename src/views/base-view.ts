/**
 * Base View — Abstract base class for diff views
 *
 * Provides shared extension assembly logic used by both
 * SideBySideView and InlineView.
 */

import { EditorState, Extension, Compartment } from '@codemirror/state'
import { EditorView, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { foldGutter, foldKeymap, codeFolding } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'

import type { DiffData, DiffThemeColors, LineMapping } from '../types'
import { diffStateField } from '../state/diff-state'
import { diffDecorationsTheme } from '../extensions/diff-decorations'
import { DiffThemeManager } from '../themes'
import {
  alignedDecorations,
  alignedDecorationsTheme,
  createSpacerAwareLineNumbers,
  createDiffMarkerGutter,
} from '../extensions/aligned-decorations'
import {
  diffFolding,
  diffFoldKeymap,
} from '../extensions/diff-folding'
import type { ClassificationCounts } from '../extensions/diff-folding'
import { changeBadges } from '../extensions/change-badges'
import { wordDiff } from '../extensions/word-diff'
import { inlineWordDiff } from '../extensions/inline-word-diff'

export interface ViewConfig {
  wordWrap: boolean
  enableFolding: boolean
  showClassification: boolean
  wordDiffMode: 'word' | 'char' | 'none'
  dark: boolean
  colors?: Partial<DiffThemeColors>
  baseTheme?: Extension
}

export abstract class BaseView {
  protected container: HTMLElement
  protected rootEl: HTMLElement
  protected config: ViewConfig
  protected themeManager: DiffThemeManager
  protected currentLineMap: LineMapping[] = []
  protected lineWrappingCompartment = new Compartment()

  constructor(container: HTMLElement, config: ViewConfig) {
    this.container = container
    this.config = config
    this.themeManager = new DiffThemeManager()
    this.rootEl = document.createElement('div')
    this.rootEl.style.height = '100%'
    this.rootEl.style.overflow = 'hidden'
    container.appendChild(this.rootEl)
  }

  abstract render(diffData: DiffData, format: 'json' | 'yaml'): void

  abstract updateTheme(dark: boolean, colors?: Partial<DiffThemeColors>, baseTheme?: Extension): void

  abstract getEditorViews(): EditorView[]

  abstract setWordWrap(enabled: boolean): void

  abstract destroy(): void

  /**
   * Reconfigure line wrapping on a live editor view.
   */
  protected reconfigureLineWrapping(view: EditorView, enabled: boolean): void {
    view.dispatch({
      effects: this.lineWrappingCompartment.reconfigure(
        enabled ? EditorView.lineWrapping : []
      ),
    })
  }

  /**
   * Build common extension array for any editor side.
   */
  protected createBaseExtensions(
    format: 'json' | 'yaml',
    side: 'before' | 'after' | 'unified',
    lineMap: LineMapping[]
  ): Extension[] {
    this.currentLineMap = lineMap
    const languageExt = format === 'json' ? json() : yaml()

    const extensions: Extension[] = [
      createSpacerAwareLineNumbers(lineMap, side, this.config.wordDiffMode, this.config.showClassification),
      drawSelection(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
      languageExt,
      diffStateField,
      diffDecorationsTheme,
      alignedDecorations(),
      alignedDecorationsTheme,
      ...this.themeManager.getExtensions(
        this.config.baseTheme,
        this.config.colors,
        this.config.dark
      ),
      EditorView.editable.of(false),
      this.lineWrappingCompartment.of(
        this.config.wordWrap ? EditorView.lineWrapping : []
      ),
      // Constrain editor to parent height so CodeMirror uses its own virtual scrolling
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ]

    // codeFolding is always loaded so that filter-as-folding works regardless
    // of enableFolding. The gutter and keyboard shortcuts are opt-in.
    {
      const capturedSide = side
      const capturedLineMap = lineMap
      extensions.push(codeFolding(this.config.showClassification ? {
        preparePlaceholder: (state, range) => this.prepareFoldPlaceholder(state, range, capturedSide, capturedLineMap),
        placeholderDOM: (_view, onclick, prepared) => this.createFoldPlaceholder(prepared, onclick),
      } : {}))
      extensions.push(diffFolding())
    }
    if (this.config.enableFolding) {
      extensions.push(foldGutter({
        openText: '\u2304',
        closedText: '\u203A',
      }))
      extensions.push(keymap.of(diffFoldKeymap))
    }

    extensions.push(createDiffMarkerGutter(lineMap, side, this.config.wordDiffMode))

    if (this.config.showClassification) {
      extensions.push(changeBadges())
    }

    return extensions
  }

  /**
   * Add word diff extension (for side-by-side mode).
   */
  protected createWordDiffExtension(): Extension[] {
    if (this.config.wordDiffMode === 'none') return []
    return [wordDiff()]
  }

  /**
   * Add inline word diff extension (for unified mode).
   */
  protected createInlineWordDiffExtension(): Extension[] {
    if (this.config.wordDiffMode === 'none') return []
    return [inlineWordDiff({ mode: this.config.wordDiffMode })]
  }

  /**
   * Compute classification counts for a specific folded range.
   * Called by CodeMirror's `preparePlaceholder` with the exact fold range.
   * Only counts lines that have real content on this editor's side
   * (skips spacer lines from the opposite side).
   */
  protected prepareFoldPlaceholder(
    state: EditorState,
    range: { from: number; to: number },
    side: 'before' | 'after' | 'unified',
    lineMap: LineMapping[]
  ): { counts: ClassificationCounts; isSpacer: boolean } {
    const doc = state.doc
    const fromLine = doc.lineAt(range.from).number
    const toLine = doc.lineAt(range.to).number
    const counts: ClassificationCounts = {
      breaking: 0,
      nonBreaking: 0,
      annotation: 0,
      unclassified: 0,
    }

    // Check if this fold range is entirely spacer lines on this side
    let hasRealContent = side === 'unified'
    if (!hasRealContent) {
      for (let lineNum = fromLine; lineNum <= toLine; lineNum++) {
        const i = lineNum - 1
        if (i >= lineMap.length) break
        const mapping = lineMap[i]
        if (side === 'before' && mapping.beforeLine !== null) { hasRealContent = true; break }
        if (side === 'after' && mapping.afterLine !== null) { hasRealContent = true; break }
      }
    }

    if (!hasRealContent) {
      return { counts, isSpacer: true }
    }

    // Scan lineMap entries that fall within this fold range.
    // Only count change roots — an added/removed block counts as one change,
    // its nested children do not add to the count.
    // Count ALL change roots regardless of spacer status so both sides show
    // identical counters for the same folded block.
    for (let lineNum = fromLine; lineNum <= toLine; lineNum++) {
      const i = lineNum - 1 // lineMap is 0-indexed
      if (i >= lineMap.length) break
      const mapping = lineMap[i]
      if (!mapping.diffType) continue
      if (!mapping.isChangeRoot) continue

      switch (mapping.diffType) {
        case 'breaking': counts.breaking++; break
        case 'non-breaking': counts.nonBreaking++; break
        case 'annotation': counts.annotation++; break
        case 'unclassified': counts.unclassified++; break
      }
    }

    return { counts, isSpacer: false }
  }

  /**
   * Create a fold placeholder DOM element with classification counter badges.
   * Receives pre-computed classification counts from `prepareFoldPlaceholder`.
   */
  protected createFoldPlaceholder(prepared: { counts: ClassificationCounts; isSpacer: boolean }, onclick?: (event: Event) => void): HTMLElement {
    const { counts, isSpacer } = prepared

    // Spacer folds: render an invisible placeholder
    if (isSpacer) {
      const spacer = document.createElement('span')
      spacer.className = 'cm-diff-fold-spacer'
      if (onclick) spacer.onclick = onclick
      return spacer
    }

    const wrapper = document.createElement('span')
    wrapper.className = 'cm-diff-fold-wrapper'
    wrapper.title = 'Click to expand'
    if (onclick) {
      wrapper.onclick = onclick
    }

    // Ellipsis badge — always shown
    const ellipsis = document.createElement('span')
    ellipsis.className = 'cm-diff-fold-badge cm-diff-fold-badge-ellipsis'
    ellipsis.textContent = '\u2026'
    wrapper.appendChild(ellipsis)

    // Classification counter badges
    const addCounter = (type: string, count: number) => {
      if (count <= 0) return
      const badge = document.createElement('span')
      badge.className = `cm-diff-fold-badge cm-diff-fold-badge-${type}`
      badge.textContent = String(count)
      badge.title = `${count} ${type.replace('-', ' ')}`
      wrapper.appendChild(badge)
    }
    addCounter('breaking', counts.breaking)
    addCounter('non-breaking', counts.nonBreaking)
    addCounter('annotation', counts.annotation)
    addCounter('unclassified', counts.unclassified)

    return wrapper
  }
}
