/**
 * Inline View — Pure DOM single-editor view
 *
 * Creates a single CodeMirror editor showing unified diff content
 * with inline word-level diffs showing removed text as widgets.
 */

import { EditorState, Extension, StateEffect, Compartment } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { foldGutter } from '@codemirror/language'

import type { DiffData, DiffThemeColors, LineMapping } from '../types'
import {
  setDiffDataEffect,
  setSideEffect,
} from '../state/diff-state'
import {
  lineMappingsField,
  setWordDiffModeEffect,
} from '../extensions/aligned-decorations'
import { createSpacerAwareLineNumbers } from '../extensions/line-numbers'
import { createDiffMarkerGutter, createClassificationGutter } from '../extensions/diff-gutters'
import { changeBadges } from '../extensions/change-badges'
import { diffFoldKeymap } from '../extensions/diff-folding'
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

  /** Stored unified data for dynamic reconfiguration */
  private unifiedLines: string[] = []
  private unifiedBeforeContentMap: Map<number, string> | null = null
  private inlineWordDiffCompartment = new Compartment()
  private foldGutterCompartment = new Compartment()
  private classificationCompartment = new Compartment()
  private diffMarkerGutterCompartment = new Compartment()
  private lineNumbersCompartment = new Compartment()

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

    // Store data for dynamic reconfiguration
    this.unifiedLines = unified.lines
    this.unifiedBeforeContentMap = unified.beforeContentMap ?? null

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

    // Create extensions — use compartments for dynamic reconfiguration
    const extensions = [
      ...this.createBaseExtensions(format, 'unified', unified.lineMap),
      this.inlineWordDiffCompartment.of(
        showWordDiff ? this.createInlineWordDiffExtension() : []
      ),
      this.classificationCompartment.of(
        this.config.showClassification
          ? [...createClassificationGutter(unified.lineMap, 'unified'), changeBadges()]
          : []
      ),
      this.lineNumbersCompartment.of(
        createSpacerAwareLineNumbers(unified.lineMap, 'unified', this.config.wordDiffMode)
      ),
      this.foldGutterCompartment.of(
        this.config.enableFolding
          ? [foldGutter({ openText: '\u2304', closedText: '\u203A' }), keymap.of(diffFoldKeymap)]
          : []
      ),
      this.diffMarkerGutterCompartment.of(
        createDiffMarkerGutter(unified.lineMap, 'unified', this.config.wordDiffMode)
      ),
    ]

    // Create editor with StateField.init() for initial mappings
    const state = EditorState.create({
      doc: unifiedContent,
      extensions: [
        ...extensions,
        lineMappingsField.init(() => ({
          mappings: unified.lineMap,
          side: 'unified' as const,
          wordDiffMode: this.config.wordDiffMode,
        })),
      ],
    })

    this.editorView = new EditorView({
      state,
      parent: this.rootEl,
    })

    // Dispatch remaining effects (diffStateField, inline word diff data)
    // lineMappingsField is already initialized via StateField.init()
    const effects: StateEffect<unknown>[] = [
      setSideEffect.of('unified'),
      setDiffDataEffect.of(diffData),
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

  setFoldingEnabled(enabled: boolean): void {
    this.config.enableFolding = enabled
    if (!this.editorView) return
    const foldExt = enabled
      ? [foldGutter({ openText: '\u2304', closedText: '\u203A' }), keymap.of(diffFoldKeymap)]
      : []
    this.editorView.dispatch({
      effects: this.foldGutterCompartment.reconfigure(foldExt),
    })
  }

  setClassificationEnabled(enabled: boolean): void {
    this.config.showClassification = enabled
    if (!this.editorView) return
    const classExt = enabled
      ? [...createClassificationGutter(this.currentLineMap, 'unified'), changeBadges()]
      : []
    this.editorView.dispatch({
      effects: this.classificationCompartment.reconfigure(classExt),
    })
  }

  setWordDiffMode(mode: 'word' | 'char' | 'none'): void {
    this.config.wordDiffMode = mode
    if (!this.editorView) return

    const showWordDiff = mode !== 'none'

    // 1. Reconfigure diff marker gutter and line numbers
    this.editorView.dispatch({
      effects: [
        this.diffMarkerGutterCompartment.reconfigure(
          createDiffMarkerGutter(this.currentLineMap, 'unified', mode)
        ),
        this.lineNumbersCompartment.reconfigure(
          createSpacerAwareLineNumbers(this.currentLineMap, 'unified', mode)
        ),
      ],
    })

    // 2. Dispatch setWordDiffModeEffect to update line decorations
    this.editorView.dispatch({ effects: setWordDiffModeEffect.of(mode) })

    // 3. Reconfigure inline word diff compartment
    if (showWordDiff) {
      this.editorView.dispatch({
        effects: this.inlineWordDiffCompartment.reconfigure(
          this.createInlineWordDiffExtension()
        ),
      })

      // Recompute and dispatch inline word diff data
      if (this.unifiedBeforeContentMap) {
        const inlineWordDiffData = buildInlineWordDiffLines(
          this.unifiedLines,
          this.currentLineMap,
          this.unifiedBeforeContentMap
        )
        if (inlineWordDiffData.length > 0) {
          this.editorView.dispatch({
            effects: setInlineWordDiffEffect.of(inlineWordDiffData),
          })
        }
      }
    } else {
      this.editorView.dispatch({
        effects: this.inlineWordDiffCompartment.reconfigure([]),
      })
    }
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
