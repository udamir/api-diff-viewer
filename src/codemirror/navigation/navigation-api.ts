import { EditorView } from '@codemirror/view'
import type { DiffType } from 'api-smart-diff'
import type { DiffBlockData } from '../../diff-builder/common'
import type { DiffData, NavigationAPI, NavigationOptions, ChangeSummary } from '../types'
import { setSelectedBlockEffect } from '../state/diff-state'

/** Implementation of the Navigation API */
export class NavigationAPIImpl implements NavigationAPI {
  private beforeView: EditorView | null
  private afterView: EditorView | null
  private diffData: DiffData
  private currentBlockIndex: number = -1
  private blockChangeListeners: Set<(block: DiffBlockData | null) => void> = new Set()
  private visibleBlocksListeners: Set<(blocks: DiffBlockData[]) => void> = new Set()

  constructor(
    beforeView: EditorView | null,
    afterView: EditorView | null,
    diffData: DiffData
  ) {
    this.beforeView = beforeView
    this.afterView = afterView
    this.diffData = diffData
  }

  /** Update views and data */
  update(beforeView: EditorView | null, afterView: EditorView | null, diffData: DiffData) {
    this.beforeView = beforeView
    this.afterView = afterView
    this.diffData = diffData
  }

  /** Navigate to a specific block */
  goToBlock(blockId: string, options: NavigationOptions = {}): void {
    const block = this.findBlock(blockId)
    if (!block) return

    const { behavior = 'smooth', align = 'center', highlight = true, expand = true } = options

    // Find the index in flat list
    const changedBlocks = this.getChangedBlocks()
    this.currentBlockIndex = changedBlocks.findIndex((b) => b.id === blockId)

    // Scroll to line in both editors
    const lineNum = block.index
    if (lineNum > 0) {
      this.scrollToLine(lineNum, behavior, align)
    }

    // Highlight the block
    if (highlight) {
      this.selectBlock(blockId)
    }

    // Notify listeners
    this.notifyBlockChange(block)
  }

  /** Navigate to next change */
  goToNextChange(filter?: DiffType[]): DiffBlockData | null {
    const changedBlocks = filter ? this.getBlocksByType(filter) : this.getChangedBlocks()

    if (changedBlocks.length === 0) return null

    this.currentBlockIndex = (this.currentBlockIndex + 1) % changedBlocks.length
    const block = changedBlocks[this.currentBlockIndex]

    this.goToBlock(block.id, { behavior: 'smooth', highlight: true })
    return block
  }

  /** Navigate to previous change */
  goToPrevChange(filter?: DiffType[]): DiffBlockData | null {
    const changedBlocks = filter ? this.getBlocksByType(filter) : this.getChangedBlocks()

    if (changedBlocks.length === 0) return null

    this.currentBlockIndex =
      this.currentBlockIndex <= 0 ? changedBlocks.length - 1 : this.currentBlockIndex - 1
    const block = changedBlocks[this.currentBlockIndex]

    this.goToBlock(block.id, { behavior: 'smooth', highlight: true })
    return block
  }

  /** Navigate to next breaking change */
  goToNextBreaking(): DiffBlockData | null {
    return this.goToNextChange(['breaking'])
  }

  /** Navigate to previous breaking change */
  goToPrevBreaking(): DiffBlockData | null {
    return this.goToPrevChange(['breaking'])
  }

  /** Navigate to specific line */
  goToLine(line: number, side: 'before' | 'after' = 'after'): void {
    const view = side === 'before' ? this.beforeView : this.afterView
    if (!view) return

    const doc = view.state.doc
    if (line > 0 && line <= doc.lines) {
      const lineInfo = doc.line(line)
      view.dispatch({
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
      })
    }
  }

  /** Get all blocks */
  getBlocks(): DiffBlockData[] {
    return this.diffData.blocks
  }

  /** Get blocks with changes (have diff metadata) */
  getChangedBlocks(): DiffBlockData[] {
    const changed: DiffBlockData[] = []

    const collectChanged = (blocks: DiffBlockData[]) => {
      for (const block of blocks) {
        if (block.diff) {
          changed.push(block)
        }
        collectChanged(block.children)
      }
    }

    collectChanged(this.diffData.blocks)
    return changed
  }

  /** Get blocks by diff type */
  getBlocksByType(types: DiffType[]): DiffBlockData[] {
    return this.getChangedBlocks().filter((block) => block.diff && types.includes(block.diff.type))
  }

  /** Get currently visible blocks */
  getVisibleBlocks(): DiffBlockData[] {
    const view = this.afterView || this.beforeView
    if (!view) return []

    const { from, to } = view.viewport
    const visible: DiffBlockData[] = []

    const checkVisible = (blocks: DiffBlockData[]) => {
      for (const block of blocks) {
        const lineNum = block.index
        if (lineNum > 0 && lineNum <= view.state.doc.lines) {
          const lineInfo = view.state.doc.line(lineNum)
          if (lineInfo.from >= from && lineInfo.from <= to) {
            visible.push(block)
          }
        }
        checkVisible(block.children)
      }
    }

    checkVisible(this.diffData.blocks)
    return visible
  }

  /** Get currently selected block */
  getCurrentBlock(): DiffBlockData | null {
    const changedBlocks = this.getChangedBlocks()
    if (this.currentBlockIndex >= 0 && this.currentBlockIndex < changedBlocks.length) {
      return changedBlocks[this.currentBlockIndex]
    }
    return null
  }

  /** Find a block by ID */
  findBlock(blockId: string): DiffBlockData | null {
    const search = (blocks: DiffBlockData[]): DiffBlockData | null => {
      for (const block of blocks) {
        if (block.id === blockId) {
          return block
        }
        const found = search(block.children)
        if (found) return found
      }
      return null
    }

    return search(this.diffData.blocks)
  }

  /** Get summary of changes */
  getChangeSummary(): ChangeSummary {
    const summary: ChangeSummary = {
      total: 0,
      breaking: 0,
      nonBreaking: 0,
      annotation: 0,
      unclassified: 0,
      byPath: new Map(),
    }

    const countChanges = (blocks: DiffBlockData[]) => {
      for (const block of blocks) {
        if (block.diff) {
          summary.total++
          switch (block.diff.type) {
            case 'breaking':
              summary.breaking++
              break
            case 'non-breaking':
              summary.nonBreaking++
              break
            case 'annotation':
              summary.annotation++
              break
            case 'unclassified':
              summary.unclassified++
              break
          }

          // Track by path
          if (block.id) {
            const pathCounts = summary.byPath.get(block.id) || []
            const existing = pathCounts.find((c) => c.type === block.diff!.type)
            if (existing) {
              existing.count++
            } else {
              pathCounts.push({ type: block.diff.type, count: 1 })
            }
            summary.byPath.set(block.id, pathCounts)
          }
        }
        countChanges(block.children)
      }
    }

    countChanges(this.diffData.blocks)
    return summary
  }

  /** Subscribe to block changes */
  onBlockChange(callback: (block: DiffBlockData | null) => void): () => void {
    this.blockChangeListeners.add(callback)
    return () => {
      this.blockChangeListeners.delete(callback)
    }
  }

  /** Subscribe to visible blocks changes */
  onVisibleBlocksChange(callback: (blocks: DiffBlockData[]) => void): () => void {
    this.visibleBlocksListeners.add(callback)
    return () => {
      this.visibleBlocksListeners.delete(callback)
    }
  }

  /** Internal: scroll to line in both editors */
  private scrollToLine(
    line: number,
    behavior: 'smooth' | 'instant',
    align: 'start' | 'center' | 'end'
  ) {
    const scrollToView = (view: EditorView | null) => {
      if (!view) return

      const doc = view.state.doc
      if (line > 0 && line <= doc.lines) {
        const lineInfo = doc.line(line)
        view.dispatch({
          effects: EditorView.scrollIntoView(lineInfo.from, {
            y: align,
          }),
        })
      }
    }

    scrollToView(this.beforeView)
    scrollToView(this.afterView)
  }

  /** Internal: select a block in both editors */
  private selectBlock(blockId: string) {
    const select = (view: EditorView | null) => {
      if (!view) return
      view.dispatch({
        effects: setSelectedBlockEffect.of(blockId),
      })
    }

    select(this.beforeView)
    select(this.afterView)
  }

  /** Internal: notify block change listeners */
  private notifyBlockChange(block: DiffBlockData | null) {
    for (const listener of this.blockChangeListeners) {
      listener(block)
    }
  }
}

/** Create navigation API instance */
export function createNavigationAPI(
  beforeView: EditorView | null,
  afterView: EditorView | null,
  diffData: DiffData
): NavigationAPI {
  return new NavigationAPIImpl(beforeView, afterView, diffData)
}
