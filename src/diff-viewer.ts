/**
 * DiffViewer — Main Orchestrator
 *
 * Manages the complete lifecycle: parsing inputs, merging specs,
 * building diff data, creating/destroying CodeMirror editors,
 * and handling runtime option changes.
 */

import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { apiMerge } from 'api-smart-diff'
import type { ComapreOptions, DiffType } from 'api-smart-diff'

import type {
  DiffData,
  DiffThemeColors,
  NavigationAPI,
  ChangeSummary,
  LineMapping,
  BlockMapping,
  MergedDocument,
} from './types'
import type { DiffPath } from './utils/path'
import { resolvePathToBlock } from './utils/path'
import type { DiffBlockData } from './diff-builder/common'
import { buildDiffBlock } from './diff-builder'

import { TypedEventEmitter } from './utils/events'
import { DiffWorkerManager } from './worker/worker-manager'
import { foldAllInView, unfoldAllInView } from './coordinator'
import { createNavigationAPI, NavigationAPIImpl } from './navigation/navigation-api'
import { buildBlockTreeIndex, type BlockTreeIndex } from './utils/block-index'
import { setBlockTreeIndexEffect } from './state/block-index-state'
import { toggleBlockExpandedEffect, setDiffDataEffect } from './state/diff-state'

import type { BaseView, ViewConfig } from './views/base-view'
import { SideBySideView } from './views/side-by-side-view'
import { InlineView } from './views/inline-view'
import { applyFilterFolds } from './extensions/filter-fold'

import './styles.css'

/** Options for creating a DiffViewer */
export interface DiffViewerOptions {
  /** Display mode. Default: 'side-by-side' */
  mode?: 'side-by-side' | 'inline'
  /** Output format. Default: 'yaml' */
  format?: 'json' | 'yaml'
  /** Active diff type filters. Default: all types shown */
  filters?: DiffType[]
  /** Enable dark theme. Default: false */
  dark?: boolean
  /** Base CodeMirror theme extension */
  theme?: Extension
  /** Diff-specific color overrides */
  colors?: Partial<DiffThemeColors>
  /** Enable code folding. Default: false */
  enableFolding?: boolean
  /** Show classification indicators (gutter bars, fold counters, badges). Default: false */
  showClassification?: boolean
  /** Word diff granularity. Default: 'word' */
  wordDiffMode?: 'word' | 'char' | 'none'
  /** Enable word wrapping. Default: true */
  wordWrap?: boolean
  /** Use WebWorker for merging. Default: true */
  useWorker?: boolean
  /** Custom worker URL. Default: inline blob */
  workerUrl?: string
  /** api-smart-diff merge options override */
  mergeOptions?: ComapreOptions
}

/** Events emitted by DiffViewer */
export type DiffViewerEvents = {
  loading: undefined
  ready: { summary: ChangeSummary }
  error: { message: string; cause?: unknown }
  navigate: { path: string | null }
  modeChange: { mode: 'side-by-side' | 'inline' }
  formatChange: { format: 'json' | 'yaml' }
  themeChange: { dark: boolean }
  wordWrapChange: { wordWrap: boolean }
}

/** Fill in required defaults */
function resolveOptions(opts?: DiffViewerOptions): Required<DiffViewerOptions> {
  return {
    mode: opts?.mode ?? 'side-by-side',
    format: opts?.format ?? 'yaml',
    filters: opts?.filters ?? [],
    dark: opts?.dark ?? false,
    theme: opts?.theme ?? ([] as Extension[]),
    colors: opts?.colors ?? {},
    enableFolding: opts?.enableFolding ?? false,
    showClassification: opts?.showClassification ?? false,
    wordDiffMode: opts?.wordDiffMode ?? 'word',
    wordWrap: opts?.wordWrap ?? true,
    useWorker: opts?.useWorker ?? true,
    workerUrl: opts?.workerUrl ?? '',
    mergeOptions: {
      ...opts?.mergeOptions,
      metaKey: "$diff",  // internal — diff-builder reads metadata from this key
      arrayMeta: true,   // internal — required for per-item array diffs
    },
  }
}

export class DiffViewer extends TypedEventEmitter<DiffViewerEvents> {
  private container: HTMLElement
  private before: object | string
  private after: object | string
  private options: Required<DiffViewerOptions>

  private currentView: BaseView | null = null
  private workerManager: DiffWorkerManager | null = null
  private _navigation: NavigationAPIImpl | null = null
  private _diffData: DiffData | null = null
  private _merged: MergedDocument | null = null
  private _changeSummary: ChangeSummary | null = null
  private _treeIndex: BlockTreeIndex | null = null

  private _destroyed = false

  constructor(
    container: HTMLElement,
    before: object | string,
    after: object | string,
    options?: DiffViewerOptions
  ) {
    super()
    this.container = container
    this.before = before
    this.after = after
    this.options = resolveOptions(options)

    if (this.options.useWorker) {
      this.workerManager = new DiffWorkerManager(
        this.options.workerUrl || undefined
      )
      this.initAsync()
    } else {
      this.initSync()
      // Emit ready via microtask so handlers registered after construction receive it
      queueMicrotask(() => {
        if (!this._destroyed && this._changeSummary) {
          this.emit('ready', { summary: this._changeSummary })
        }
      })
    }
  }

  // ── Lifecycle ──

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true

    this.currentView?.destroy()
    this.currentView = null
    this.workerManager?.destroy()
    this.workerManager = null
    this.removeAllListeners()
    this._navigation = null
    this._diffData = null
    this._merged = null
    this._changeSummary = null
    this._treeIndex = null
  }

  // ── Data Updates ──

  update(before: object | string, after: object | string): void {
    if (this._destroyed) return
    this.before = before
    this.after = after

    if (this.options.useWorker && this.workerManager) {
      this.initAsync()
    } else {
      this.emit('loading', undefined)
      try {
        this.initSync()
        this.emit('ready', { summary: this._changeSummary! })
      } catch (error) {
        this.emit('error', { message: String(error), cause: error })
      }
    }
  }

  // ── Display Controls ──

  setMode(mode: 'side-by-side' | 'inline'): void {
    if (this._destroyed || this.options.mode === mode) return
    this.options.mode = mode
    this.rebuildView()
    this.emit('modeChange', { mode })
  }

  getMode(): 'side-by-side' | 'inline' {
    return this.options.mode
  }

  setFormat(format: 'json' | 'yaml'): void {
    if (this._destroyed || this.options.format === format) return
    this.options.format = format
    // Re-build diff blocks and view since content representation changes
    if (this._merged) {
      this._diffData = this.buildDiffData(this._merged, format)
      this.rebuildView()
    }
    this.emit('formatChange', { format })
  }

  getFormat(): 'json' | 'yaml' {
    return this.options.format
  }

  setFilters(filters: DiffType[]): void {
    if (this._destroyed) return
    this.options.filters = filters

    // Apply filter folds to editor views
    if (this._diffData) {
      const views = this.currentView?.getEditorViews() ?? []
      for (const view of views) {
        applyFilterFolds(view, this._diffData.blocks, filters)
      }
    }
  }

  getFilters(): DiffType[] {
    return [...this.options.filters]
  }

  setTheme(options: { dark?: boolean; theme?: Extension; colors?: Partial<DiffThemeColors> }): void {
    if (this._destroyed) return

    if (options.dark !== undefined) {
      this.options.dark = options.dark
    }
    if (options.colors) {
      this.options.colors = options.colors
    }
    if (options.theme !== undefined) {
      this.options.theme = options.theme
      // Base theme change requires full rebuild
      this.rebuildView()
      this.emit('themeChange', { dark: this.options.dark })
      return
    }

    // Just diff theme/dark change — update via theme manager
    this.currentView?.updateTheme(this.options.dark, this.options.colors, this.options.theme)
    this.emit('themeChange', { dark: this.options.dark })
  }

  isDark(): boolean {
    return this.options.dark
  }

  setFoldingEnabled(enabled: boolean): void {
    if (this._destroyed || this.options.enableFolding === enabled) return
    this.options.enableFolding = enabled
    this.currentView?.setFoldingEnabled(enabled)
  }

  getFoldingEnabled(): boolean {
    return this.options.enableFolding
  }

  setClassificationEnabled(enabled: boolean): void {
    if (this._destroyed || this.options.showClassification === enabled) return
    this.options.showClassification = enabled
    this.currentView?.setClassificationEnabled(enabled)
  }

  getClassificationEnabled(): boolean {
    return this.options.showClassification
  }

  setWordDiffMode(mode: 'word' | 'char' | 'none'): void {
    if (this._destroyed || this.options.wordDiffMode === mode) return
    this.options.wordDiffMode = mode
    this.currentView?.setWordDiffMode(mode)
  }

  getWordDiffMode(): 'word' | 'char' | 'none' {
    return this.options.wordDiffMode
  }

  setWordWrap(enabled: boolean): void {
    if (this._destroyed || this.options.wordWrap === enabled) return
    this.options.wordWrap = enabled
    this.currentView?.setWordWrap(enabled)
    this.emit('wordWrapChange', { wordWrap: enabled })
  }

  getWordWrap(): boolean {
    return this.options.wordWrap
  }

  // ── Fold Control ──

  expandAll(): void {
    if (this.options.filters.length > 0) {
      this.setFilters([])
    }
    const views = this.currentView?.getEditorViews() ?? []
    for (const view of views) unfoldAllInView(view)
  }

  collapseAll(): void {
    if (this.options.filters.length > 0) {
      this.setFilters([])
    }
    const views = this.currentView?.getEditorViews() ?? []
    for (const view of views) foldAllInView(view)
  }

  togglePath(path: DiffPath): void {
    if (!this._diffData) return
    const block = resolvePathToBlock(path, this._diffData.blocks)
    if (!block) return

    const blockId = block.id
    const views = this.currentView?.getEditorViews() ?? []
    for (const view of views) {
      view.dispatch({ effects: toggleBlockExpandedEffect.of(blockId) })
    }
  }

  // ── Navigation ──

  get navigation(): NavigationAPI {
    if (!this._navigation) {
      // Return a stub that does nothing if not yet initialized
      return createNavigationAPI(null, null, { blocks: [], lineMap: [], blockMap: [] })
    }
    return this._navigation
  }

  // ── Events ──
  // Inherited from TypedEventEmitter: on(), off()

  // ── Advanced / Escape Hatches ──

  getEditorViews(): { before?: EditorView; after?: EditorView; unified?: EditorView } {
    if (!this.currentView) return {}
    const views = this.currentView.getEditorViews()

    if (this.options.mode === 'side-by-side') {
      return { before: views[0], after: views[1] }
    } else {
      return { unified: views[0] }
    }
  }

  getChangeSummary(): ChangeSummary {
    if (this._changeSummary) return this._changeSummary
    return {
      total: 0,
      breaking: 0,
      nonBreaking: 0,
      annotation: 0,
      unclassified: 0,
      byPath: new Map(),
    }
  }

  // ── Internal ──

  private async initAsync(): Promise<void> {
    if (this._destroyed) return

    this.emit('loading', undefined)

    try {
      const beforeObj = this.parseInput(this.before)
      const afterObj = this.parseInput(this.after)

      let merged = await this.workerManager!.merge(
        beforeObj,
        afterObj,
        this.options.mergeOptions
      )

      if (this._destroyed) return

      this._merged = merged
      this._diffData = this.buildDiffData(merged, this.options.format)
      this.rebuildView()

      this.emit('ready', { summary: this._changeSummary! })
    } catch (error) {
      if (!this._destroyed) {
        this.emit('error', { message: String(error), cause: error })
      }
    }
  }

  private initSync(): void {
    const beforeObj = this.parseInput(this.before)
    const afterObj = this.parseInput(this.after)

    const merged = apiMerge(beforeObj, afterObj, this.options.mergeOptions) as MergedDocument
    this._merged = merged
    this._diffData = this.buildDiffData(merged, this.options.format)
    this.rebuildView()
  }

  private parseInput(input: object | string): unknown {
    if (typeof input === 'string') {
      // Try JSON first
      try {
        return JSON.parse(input)
      } catch {
        // Try YAML (api-smart-diff handles this)
        // For now, return the string as-is; apiMerge can handle strings
        return input
      }
    }
    return input
  }

  /** Threshold: skip tree-level word diff for docs exceeding this many keys */
  private static readonly LARGE_DOC_THRESHOLD = 3000

  private estimateDocSize(obj: unknown, count = { n: 0 }): number {
    if (count.n > DiffViewer.LARGE_DOC_THRESHOLD) return count.n
    if (typeof obj !== 'object' || obj === null) return count.n
    if (Array.isArray(obj)) {
      for (const item of obj) {
        count.n++
        this.estimateDocSize(item, count)
        if (count.n > DiffViewer.LARGE_DOC_THRESHOLD) return count.n
      }
    } else {
      for (const key of Object.keys(obj)) {
        count.n++
        this.estimateDocSize((obj as Record<string, unknown>)[key], count)
        if (count.n > DiffViewer.LARGE_DOC_THRESHOLD) return count.n
      }
    }
    return count.n
  }

  private buildDiffData(merged: MergedDocument, format: 'json' | 'yaml'): DiffData {
    const skipWordDiff = this.estimateDocSize(merged) > DiffViewer.LARGE_DOC_THRESHOLD
    const rootBlock = buildDiffBlock(merged, format, { skipWordDiff })

    // Build line map and block map from the diff blocks
    const lineMap: LineMapping[] = []
    const blockMap: BlockMapping[] = []

    const blocks = [rootBlock]

    // Build pre-computed tree index
    this._treeIndex = buildBlockTreeIndex(blocks)

    return {
      blocks,
      lineMap,
      blockMap,
    }
  }

  private rebuildView(): void {
    if (this._destroyed || !this._diffData) return

    // Destroy current view
    this.currentView?.destroy()
    this.currentView = null
    this._navigation = null

    const viewConfig: ViewConfig = {
      wordWrap: this.options.wordWrap,
      enableFolding: this.options.enableFolding,
      showClassification: this.options.showClassification,
      wordDiffMode: this.options.wordDiffMode,
      dark: this.options.dark,
      colors: this.options.colors,
      baseTheme: this.options.theme,
    }

    // Create appropriate view
    if (this.options.mode === 'side-by-side') {
      this.currentView = new SideBySideView(this.container, viewConfig)
    } else {
      this.currentView = new InlineView(this.container, viewConfig)
    }

    this.currentView.render(this._diffData, this.options.format)

    // Set up navigation
    const views = this.currentView.getEditorViews()

    if (this.options.mode === 'side-by-side' && views.length === 2) {
      this._navigation = new NavigationAPIImpl(views[0], views[1], this._diffData, this._merged)

      // Dispatch tree index to both editor states
      if (this._treeIndex) {
        views[0].dispatch({ effects: [
          setBlockTreeIndexEffect.of(this._treeIndex),
          setDiffDataEffect.of(this._diffData),
        ] })
        views[1].dispatch({ effects: [
          setBlockTreeIndexEffect.of(this._treeIndex),
          setDiffDataEffect.of(this._diffData),
        ] })
      }
    } else if (views.length > 0) {
      this._navigation = new NavigationAPIImpl(null, views[0], this._diffData, this._merged)
    }

    // Wire navigate event
    if (this._navigation) {
      this._navigation.onNavigate((path) => {
        this.emit('navigate', { path })
      })
    }

    // Compute change summary
    this._changeSummary = this._navigation?.getChangeSummary() ?? {
      total: 0,
      breaking: 0,
      nonBreaking: 0,
      annotation: 0,
      unclassified: 0,
      byPath: new Map(),
    }

    // Apply initial filter folds
    if (this.options.filters.length > 0 && this._diffData) {
      const editorViews = this.currentView?.getEditorViews() ?? []
      for (const view of editorViews) {
        applyFilterFolds(view, this._diffData.blocks, this.options.filters)
      }
    }
  }
}

/**
 * Create a DiffViewer instance.
 *
 * @param container - DOM element to mount the diff viewer into
 * @param before - The "before" API spec (object or JSON/YAML string)
 * @param after - The "after" API spec (object or JSON/YAML string)
 * @param options - Configuration options
 * @returns A DiffViewer instance
 *
 * @example
 * ```typescript
 * import { createDiffViewer } from 'api-diff-viewer'
 * import 'api-diff-viewer/style.css'
 *
 * const viewer = createDiffViewer(
 *   document.getElementById('diff')!,
 *   openApiV1,
 *   openApiV2,
 *   { format: 'yaml', mode: 'side-by-side' }
 * )
 *
 * viewer.on('ready', ({ summary }) => {
 *   console.log(`${summary.breaking} breaking changes`)
 * })
 *
 * // Cleanup
 * viewer.destroy()
 * ```
 */
export function createDiffViewer(
  container: HTMLElement,
  before: object | string,
  after: object | string,
  options?: DiffViewerOptions
): DiffViewer {
  return new DiffViewer(container, before, after, options)
}
