/**
 * Side-by-Side View — Pure DOM dual-editor view
 *
 * Creates two synchronized CodeMirror editors showing before/after content
 * with aligned spacer lines, scroll sync, and optional fold sync.
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
  setLineMappingsEffect,
  setEditorSideEffect,
  setWordDiffModeEffect,
  createSpacerAwareLineNumbers,
  createDiffMarkerGutter,
  createClassificationGutter,
} from '../extensions/aligned-decorations'
import { changeBadges } from '../extensions/change-badges'
import { diffFoldKeymap } from '../extensions/diff-folding'
import {
  generateAlignedContentFromDiff,
  type AlignmentResult,
} from '../sync/visual-alignment'
import { setupFoldSync } from '../sync/fold-sync'
import { extractFoldedBlockIds, restoreFoldsFromBlockIds } from '../sync/fold-state'
import { setupHeightSync, type HeightSyncHandle, setHeightPaddingEffect } from '../sync/height-sync'
import {
  buildWordDiffData,
  setWordDiffDataEffect,
  wordDiffPluginOnly,
} from '../extensions/word-diff'
import { wordDiffRequestor } from '../extensions/word-diff-requestor'

import { BaseView, type ViewConfig } from './base-view'

/** Pending parameter updates to be applied in batch */
interface PendingUpdate {
  wordWrap?: boolean
  wordDiffMode?: 'word' | 'char' | 'none'
  enableFolding?: boolean
  showClassification?: boolean
}

/** Pre-computed update data ready for dispatch */
interface ComputedUpdate {
  // Document changes (only if wordDiffMode changed)
  beforeContent?: string
  afterContent?: string

  // Line mappings (only if wordDiffMode changed)
  lineMap?: LineMapping[]
  blockLineRanges?: Map<string, { start: number; end: number }>

  // Alignment lines (only if wordDiffMode changed)
  beforeLines?: string[]
  afterLines?: string[]

  // Effects to dispatch
  beforeEffects: StateEffect<unknown>[]
  afterEffects: StateEffect<unknown>[]

  // Fold state to restore
  foldedBlockIds: Set<string>

  // Side effects
  setupFoldSync?: boolean
  teardownFoldSync?: boolean
}

export class SideBySideView extends BaseView {
  private beforeView: EditorView | null = null
  private afterView: EditorView | null = null
  private beforeContainer: HTMLElement | null = null
  private afterContainer: HTMLElement | null = null
  private scrollSyncCleanup: (() => void) | null = null
  private foldSyncCleanup: (() => void) | null = null
  private heightSyncHandle: HeightSyncHandle | null = null

  /** Batch update state */
  private pendingUpdate: PendingUpdate | null = null
  private updateRafId: number | null = null

  /** Stored alignment data for dynamic reconfiguration */
  private alignmentBeforeLines: string[] = []
  private alignmentAfterLines: string[] = []
  
  /** Compartments for before editor */
  private beforeWordDiffCompartment = new Compartment()
  private beforeFoldGutterCompartment = new Compartment()
  private beforeClassificationCompartment = new Compartment()
  private beforeDiffMarkerGutterCompartment = new Compartment()
  private beforeLineNumbersCompartment = new Compartment()
  
  /** Compartments for after editor */
  private afterWordDiffCompartment = new Compartment()
  private afterFoldGutterCompartment = new Compartment()
  private afterClassificationCompartment = new Compartment()
  private afterDiffMarkerGutterCompartment = new Compartment()
  private afterLineNumbersCompartment = new Compartment()

  /** Stored diff data for incremental updates */
  private currentDiffData: DiffData | null = null
  private currentFormat: 'json' | 'yaml' = 'yaml'
  private currentBlockLineRanges: Map<string, { start: number; end: number }> = new Map()

  constructor(container: HTMLElement, config: ViewConfig) {
    super(container, config)
  }

  render(diffData: DiffData, format: 'json' | 'yaml'): void {
    // Clean up any existing editors
    this.destroyEditors()

    // Store diff data for incremental updates
    this.currentDiffData = diffData
    this.currentFormat = format

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

    // Store alignment data for dynamic reconfiguration
    this.alignmentBeforeLines = alignment.beforeLines
    this.alignmentAfterLines = alignment.afterLines
    this.currentBlockLineRanges = alignment.blockLineRanges

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

    // Create before editor with compartments for dynamic reconfiguration
    // Gutter order: classification → line numbers → fold gutter → diff marker
    const beforeExtensions = [
      ...this.createBaseExtensions(format, 'before', alignment.lineMap),
      this.beforeWordDiffCompartment.of(
        showWordDiff
          ? [wordDiffPluginOnly(), wordDiffRequestor(alignment.beforeLines, alignment.afterLines, 'before', diffMode)]
          : []
      ),
      this.beforeClassificationCompartment.of(
        this.config.showClassification
          ? [...createClassificationGutter(alignment.lineMap, 'before'), changeBadges()]
          : []
      ),
      this.beforeLineNumbersCompartment.of(
        createSpacerAwareLineNumbers(alignment.lineMap, 'before', this.config.wordDiffMode)
      ),
      this.beforeFoldGutterCompartment.of(
        this.config.enableFolding
          ? [foldGutter({ openText: '\u2304', closedText: '\u203A' }), keymap.of(diffFoldKeymap)]
          : []
      ),
      this.beforeDiffMarkerGutterCompartment.of(
        createDiffMarkerGutter(alignment.lineMap, 'before', this.config.wordDiffMode)
      ),
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

    // Create after editor with compartments for dynamic reconfiguration
    // Gutter order: classification → line numbers → fold gutter → diff marker
    const afterExtensions = [
      ...this.createBaseExtensions(format, 'after', alignment.lineMap),
      this.afterWordDiffCompartment.of(
        showWordDiff
          ? [wordDiffPluginOnly(), wordDiffRequestor(alignment.beforeLines, alignment.afterLines, 'after', diffMode)]
          : []
      ),
      this.afterClassificationCompartment.of(
        this.config.showClassification
          ? [...createClassificationGutter(alignment.lineMap, 'after'), changeBadges()]
          : []
      ),
      this.afterLineNumbersCompartment.of(
        createSpacerAwareLineNumbers(alignment.lineMap, 'after', this.config.wordDiffMode)
      ),
      this.afterFoldGutterCompartment.of(
        this.config.enableFolding
          ? [foldGutter({ openText: '\u2304', closedText: '\u203A' }), keymap.of(diffFoldKeymap)]
          : []
      ),
      this.afterDiffMarkerGutterCompartment.of(
        createDiffMarkerGutter(alignment.lineMap, 'after', this.config.wordDiffMode)
      ),
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
    this.heightSyncHandle = setupHeightSync(this.beforeView, this.afterView)

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
    // Cancel any pending update
    if (this.updateRafId !== null) {
      cancelAnimationFrame(this.updateRafId)
      this.updateRafId = null
    }
    this.pendingUpdate = null

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
    this.heightSyncHandle?.destroy()
    this.heightSyncHandle = null
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

  // ─────────────────────────────────────────────────────────────────
  // Public setters - queue changes instead of applying immediately
  // ─────────────────────────────────────────────────────────────────

  setWordWrap(enabled: boolean): void {
    if (this.config.wordWrap === enabled) return
    this.queueUpdate({ wordWrap: enabled })
  }

  setFoldingEnabled(enabled: boolean): void {
    if (this.config.enableFolding === enabled) return
    this.queueUpdate({ enableFolding: enabled })
  }

  setClassificationEnabled(enabled: boolean): void {
    if (this.config.showClassification === enabled) return
    this.queueUpdate({ showClassification: enabled })
  }

  setWordDiffMode(mode: 'word' | 'char' | 'none'): void {
    if (this.config.wordDiffMode === mode) return
    this.queueUpdate({ wordDiffMode: mode })
  }

  // ─────────────────────────────────────────────────────────────────
  // Queue and schedule mechanism
  // ─────────────────────────────────────────────────────────────────

  private queueUpdate(update: Partial<PendingUpdate>): void {
    // Merge with any existing pending updates
    this.pendingUpdate = { ...this.pendingUpdate, ...update }

    // Schedule RAF if not already scheduled
    if (this.updateRafId === null) {
      this.updateRafId = requestAnimationFrame(() => {
        this.updateRafId = null
        this.applyPendingUpdates()
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Phase 1: Calculate all changes (pure computation, no DOM)
  // ─────────────────────────────────────────────────────────────────

  private computeUpdates(updates: PendingUpdate): ComputedUpdate {
    const result: ComputedUpdate = {
      beforeEffects: [],
      afterEffects: [],
      foldedBlockIds: new Set(),
    }

    if (!this.beforeView || !this.afterView) return result

    // Save fold state BEFORE any changes
    result.foldedBlockIds = extractFoldedBlockIds(this.beforeView, this.currentLineMap)

    // Track if we need new alignment (wordDiffMode changes document structure)
    let alignment: AlignmentResult | null = null

    // ── Process wordDiffMode first (changes document structure) ──
    if (updates.wordDiffMode !== undefined && this.currentDiffData) {
      alignment = generateAlignedContentFromDiff(
        this.currentDiffData.blocks,
        this.currentFormat,
        null,
        null,
        { wordDiffMode: updates.wordDiffMode }
      )

      result.beforeContent = alignment.beforeLines.join('\n')
      result.afterContent = alignment.afterLines.join('\n')
      result.lineMap = alignment.lineMap
      result.blockLineRanges = alignment.blockLineRanges
      result.beforeLines = alignment.beforeLines
      result.afterLines = alignment.afterLines

      const mode = updates.wordDiffMode
      const showWordDiff = mode !== 'none'
      const diffMode = mode === 'none' ? undefined : mode

      // Line mappings effect
      result.beforeEffects.push(setLineMappingsEffect.of(alignment.lineMap))
      result.afterEffects.push(setLineMappingsEffect.of(alignment.lineMap))

      // Word diff mode effect
      result.beforeEffects.push(setWordDiffModeEffect.of(mode))
      result.afterEffects.push(setWordDiffModeEffect.of(mode))

      // Diff marker gutter
      result.beforeEffects.push(
        this.beforeDiffMarkerGutterCompartment.reconfigure(
          createDiffMarkerGutter(alignment.lineMap, 'before', mode)
        )
      )
      result.afterEffects.push(
        this.afterDiffMarkerGutterCompartment.reconfigure(
          createDiffMarkerGutter(alignment.lineMap, 'after', mode)
        )
      )

      // Line numbers
      result.beforeEffects.push(
        this.beforeLineNumbersCompartment.reconfigure(
          createSpacerAwareLineNumbers(alignment.lineMap, 'before', mode)
        )
      )
      result.afterEffects.push(
        this.afterLineNumbersCompartment.reconfigure(
          createSpacerAwareLineNumbers(alignment.lineMap, 'after', mode)
        )
      )

      // Word diff extensions (plugin only - state field is in base extensions)
      const wordDiffExtBefore = showWordDiff
        ? [wordDiffPluginOnly(), wordDiffRequestor(alignment.beforeLines, alignment.afterLines, 'before', diffMode)]
        : []
      const wordDiffExtAfter = showWordDiff
        ? [wordDiffPluginOnly(), wordDiffRequestor(alignment.beforeLines, alignment.afterLines, 'after', diffMode)]
        : []

      result.beforeEffects.push(this.beforeWordDiffCompartment.reconfigure(wordDiffExtBefore))
      result.afterEffects.push(this.afterWordDiffCompartment.reconfigure(wordDiffExtAfter))

      // Word diff data
      if (showWordDiff) {
        const wordDiffDataBefore = buildWordDiffData(
          alignment.lineMap, alignment.beforeLines, alignment.afterLines,
          'before', diffMode
        )
        const wordDiffDataAfter = buildWordDiffData(
          alignment.lineMap, alignment.beforeLines, alignment.afterLines,
          'after', diffMode
        )

        if (wordDiffDataBefore.length > 0) {
          result.beforeEffects.push(setWordDiffDataEffect.of(wordDiffDataBefore))
        }
        if (wordDiffDataAfter.length > 0) {
          result.afterEffects.push(setWordDiffDataEffect.of(wordDiffDataAfter))
        }
      }
    }

    // ── Process wordWrap ──
    if (updates.wordWrap !== undefined) {
      result.beforeEffects.push(
        this.lineWrappingCompartment.reconfigure(
          updates.wordWrap ? EditorView.lineWrapping : []
        )
      )
      result.afterEffects.push(
        this.lineWrappingCompartment.reconfigure(
          updates.wordWrap ? EditorView.lineWrapping : []
        )
      )
    }

    // ── Process enableFolding ──
    if (updates.enableFolding !== undefined) {
      const foldExt = updates.enableFolding
        ? [foldGutter({ openText: '\u2304', closedText: '\u203A' }), keymap.of(diffFoldKeymap)]
        : []
      result.beforeEffects.push(this.beforeFoldGutterCompartment.reconfigure(foldExt))
      result.afterEffects.push(this.afterFoldGutterCompartment.reconfigure(foldExt))

      // Track fold sync lifecycle changes
      if (updates.enableFolding && !this.foldSyncCleanup) {
        result.setupFoldSync = true
      } else if (!updates.enableFolding && this.foldSyncCleanup) {
        result.teardownFoldSync = true
      }
    }

    // ── Process showClassification ──
    if (updates.showClassification !== undefined) {
      const lineMap = result.lineMap || this.currentLineMap
      const classExtBefore = updates.showClassification
        ? [...createClassificationGutter(lineMap, 'before'), changeBadges()]
        : []
      const classExtAfter = updates.showClassification
        ? [...createClassificationGutter(lineMap, 'after'), changeBadges()]
        : []
      result.beforeEffects.push(this.beforeClassificationCompartment.reconfigure(classExtBefore))
      result.afterEffects.push(this.afterClassificationCompartment.reconfigure(classExtAfter))
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────
  // Phase 2: Apply all changes (DOM mutations) with Hidden Measurement
  // ─────────────────────────────────────────────────────────────────

  private applyPendingUpdates(): void {
    const updates = this.pendingUpdate
    if (!updates || !this.beforeView || !this.afterView) {
      this.pendingUpdate = null
      return
    }
    this.pendingUpdate = null

    const beforeDom = this.beforeView.dom
    const afterDom = this.afterView.dom

    // Compute all changes
    const computed = this.computeUpdates(updates)

    // Check if document structure is changing (wordDiffMode change)
    const documentChanging = computed.beforeContent !== undefined

    // Only use hidden measurement technique when document structure changes
    if (documentChanging) {
      beforeDom.style.visibility = 'hidden'
      afterDom.style.visibility = 'hidden'
    }

    try {
      // Update config values
      if (updates.wordWrap !== undefined) this.config.wordWrap = updates.wordWrap
      if (updates.wordDiffMode !== undefined) this.config.wordDiffMode = updates.wordDiffMode
      if (updates.enableFolding !== undefined) this.config.enableFolding = updates.enableFolding
      if (updates.showClassification !== undefined) this.config.showClassification = updates.showClassification

      // Update stored alignment data if changed
      if (computed.lineMap) {
        this.currentLineMap = computed.lineMap
        this.currentBlockLineRanges = computed.blockLineRanges!
      }
      if (computed.beforeLines) {
        this.alignmentBeforeLines = computed.beforeLines
      }
      if (computed.afterLines) {
        this.alignmentAfterLines = computed.afterLines
      }

      // Build effects - only clear padding if document structure is changing
      const beforeEffectsToDispatch = documentChanging
        ? [...computed.beforeEffects, setHeightPaddingEffect.of([])]
        : computed.beforeEffects
      const afterEffectsToDispatch = documentChanging
        ? [...computed.afterEffects, setHeightPaddingEffect.of([])]
        : computed.afterEffects

      // Dispatch main changes
      this.beforeView.dispatch({
        changes: computed.beforeContent !== undefined
          ? { from: 0, to: this.beforeView.state.doc.length, insert: computed.beforeContent }
          : undefined,
        effects: beforeEffectsToDispatch,
      })

      this.afterView.dispatch({
        changes: computed.afterContent !== undefined
          ? { from: 0, to: this.afterView.state.doc.length, insert: computed.afterContent }
          : undefined,
        effects: afterEffectsToDispatch,
      })

      // Handle fold sync lifecycle
      if (computed.teardownFoldSync && this.foldSyncCleanup) {
        this.foldSyncCleanup()
        this.foldSyncCleanup = null
      }
      if (computed.setupFoldSync && this.beforeView && this.afterView) {
        this.foldSyncCleanup = setupFoldSync(
          this.beforeView,
          this.afterView,
          this.currentLineMap
        )
      }

      // Restore folds if document structure changed
      if (computed.blockLineRanges && this.beforeView && this.afterView) {
        restoreFoldsFromBlockIds(this.beforeView, computed.foldedBlockIds, computed.blockLineRanges)
        restoreFoldsFromBlockIds(this.afterView, computed.foldedBlockIds, computed.blockLineRanges)
      }

      // Force layout and measure heights
      if (documentChanging) {
        void beforeDom.offsetHeight
        void afterDom.offsetHeight
        this.heightSyncHandle?.reEqualize()
        void beforeDom.offsetHeight
        void afterDom.offsetHeight
        this.heightSyncHandle?.reEqualize()
      } else {
        this.heightSyncHandle?.reEqualize()
      }

    } finally {
      if (documentChanging) {
        beforeDom.style.visibility = ''
        afterDom.style.visibility = ''
      }
    }
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
