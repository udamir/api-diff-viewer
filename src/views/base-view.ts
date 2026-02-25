/**
 * Base View — Abstract base class for diff views
 *
 * Provides shared extension assembly logic used by both
 * SideBySideView and InlineView.
 */

import { Extension, Compartment } from '@codemirror/state'
import { EditorView, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { foldKeymap, codeFolding } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'

import type { DiffData, DiffThemeColors, LineMapping } from '../types'
import { diffStateField } from '../state/diff-state'
import { diffDecorationsTheme } from '../extensions/diff-decorations'
import { DiffThemeManager } from '../themes'
import {
  alignedDecorations,
  alignedDecorationsTheme,
} from '../extensions/aligned-decorations'
import {
  diffFolding,
} from '../extensions/diff-folding'
import { wordDiffStateField } from '../extensions/word-diff'
import { inlineWordDiff } from '../extensions/inline-word-diff'
import { prepareFoldPlaceholder, createFoldPlaceholder } from '../extensions/fold-placeholder'

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

  abstract setFoldingEnabled(enabled: boolean): void

  abstract setClassificationEnabled(enabled: boolean): void

  abstract setWordDiffMode(mode: 'word' | 'char' | 'none'): void

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
    // Custom placeholder is ALWAYS registered so spacer-only folds are rendered
    // invisible. Without it, CodeMirror's default placeholder shows a visible
    // background/border on spacer lines.
    {
      const capturedSide = side
      const capturedLineMap = lineMap
      extensions.push(codeFolding({
        preparePlaceholder: (state, range) => {
          const data = prepareFoldPlaceholder(state, range, capturedSide, capturedLineMap)
          if (!this.config.showClassification && !data.isSpacer) {
            return { counts: { breaking: 0, nonBreaking: 0, annotation: 0, unclassified: 0 }, isSpacer: false }
          }
          return data
        },
        placeholderDOM: (_view, onclick, prepared) => createFoldPlaceholder(prepared, onclick),
      }))
      extensions.push(diffFolding())
    }

    // Note: The following extensions are NOT added here because they are managed
    // by compartments in the subclass (SideBySideView) for dynamic reconfiguration:
    // - createSpacerAwareLineNumbers (lineNumbersCompartment)
    // - foldGutter + diffFoldKeymap (foldGutterCompartment)
    // - createDiffMarkerGutter (diffMarkerGutterCompartment)
    // - changeBadges + createClassificationGutter (classificationCompartment)
    // - wordDiffPlugin + wordDiffTheme (wordDiffCompartment)

    // Always add wordDiffStateField so it persists across compartment reconfigurations
    extensions.push(wordDiffStateField())

    return extensions
  }

  /**
   * Add inline word diff extension (for unified mode).
   */
  protected createInlineWordDiffExtension(): Extension[] {
    if (this.config.wordDiffMode === 'none') return []
    return [inlineWordDiff({ mode: this.config.wordDiffMode })]
  }

}
