import { EditorView } from '@codemirror/view'
import { foldEffect, unfoldEffect, foldedRanges, foldable } from '@codemirror/language'
import type { StateEffect } from '@codemirror/state'
import type { DiffType } from 'api-smart-diff'
import type { DiffBlockData } from './diff-builder/common'
import type {
  DiffData,
  DiffCoordinator,
  NavigationOptions,
  NavigationAPI,
  MergedDocument,
} from './types'
import type { DiffPath } from './utils/path'
import { resolvePathToBlock } from './utils/path'
import { NavigationAPIImpl } from './navigation/navigation-api'
import type { BlockTreeIndex } from './utils/block-index'
import { setBlockTreeIndexEffect } from './state/block-index-state'
import {
  setExpandedBlocksEffect,
  toggleBlockExpandedEffect,
  setDiffDataEffect,
} from './state/diff-state'

/** Implementation of the DiffCoordinator (internal) */
class DiffCoordinatorImpl implements DiffCoordinator {
  private _beforeView: EditorView
  private _afterView: EditorView
  private _navigation: NavigationAPIImpl
  private _diffData: DiffData
  private _treeIndex: BlockTreeIndex | null = null

  constructor(
    beforeView: EditorView,
    afterView: EditorView,
    diffData: DiffData,
    merged?: MergedDocument | null,
    treeIndex?: BlockTreeIndex | null
  ) {
    this._beforeView = beforeView
    this._afterView = afterView
    this._diffData = diffData
    this._treeIndex = treeIndex ?? null
    this._navigation = new NavigationAPIImpl(beforeView, afterView, diffData, merged)

    // Dispatch treeIndex to editor state
    if (this._treeIndex) {
      this._beforeView.dispatch({ effects: setBlockTreeIndexEffect.of(this._treeIndex) })
      this._afterView.dispatch({ effects: setBlockTreeIndexEffect.of(this._treeIndex) })
    }
  }

  get beforeView(): EditorView {
    return this._beforeView
  }

  get afterView(): EditorView {
    return this._afterView
  }

  get navigation(): NavigationAPI {
    return this._navigation
  }

  goToPath(path: DiffPath, options?: NavigationOptions): void {
    this._navigation.goToPath(path, options)
  }

  goToNextChange(...types: DiffType[]): string | null {
    return this._navigation.goToNextChange(...types)
  }

  goToPrevChange(...types: DiffType[]): string | null {
    return this._navigation.goToPrevChange(...types)
  }

  expandAll(): void {
    unfoldAllInView(this._beforeView)
    unfoldAllInView(this._afterView)
  }

  collapseAll(): void {
    foldAllInView(this._beforeView)
    foldAllInView(this._afterView)
  }

  togglePath(path: DiffPath): void {
    const block = resolvePathToBlock(path, this._diffData.blocks)
    if (!block) return

    const blockId = block.id
    this._beforeView.dispatch({
      effects: toggleBlockExpandedEffect.of(blockId),
    })
    this._afterView.dispatch({
      effects: toggleBlockExpandedEffect.of(blockId),
    })
  }

  updateDiffData(newData: DiffData, merged?: MergedDocument, treeIndex?: BlockTreeIndex | null): void {
    this._diffData = newData
    this._treeIndex = treeIndex ?? null
    this._navigation.update(this._beforeView, this._afterView, newData, merged, this._treeIndex)

    const effects: import('@codemirror/state').StateEffect<unknown>[] = [
      setDiffDataEffect.of(newData),
    ]
    if (this._treeIndex) {
      effects.push(setBlockTreeIndexEffect.of(this._treeIndex))
    }

    this._beforeView.dispatch({ effects })
    this._afterView.dispatch({ effects })
  }

  destroy(): void {
    // Coordinator does not own the editor views — the view layer handles their lifecycle.
  }

  private collectBlockIds(blocks: DiffBlockData[]): string[] {
    const ids: string[] = []
    for (const block of blocks) {
      if (block.id) {
        ids.push(block.id)
      }
      ids.push(...this.collectBlockIds(block.children))
    }
    return ids
  }
}

/** Create a coordinator for a diff pair (internal) */
export function createCoordinator(
  beforeView: EditorView,
  afterView: EditorView,
  diffData: DiffData,
  merged?: MergedDocument | null,
  treeIndex?: BlockTreeIndex | null
): DiffCoordinator {
  return new DiffCoordinatorImpl(beforeView, afterView, diffData, merged, treeIndex)
}

/** Unfold all folded ranges in a single editor view */
export function unfoldAllInView(view: EditorView): void {
  const folded = foldedRanges(view.state)
  const effects: StateEffect<{ from: number; to: number }>[] = []
  folded.between(0, view.state.doc.length, (from, to) => {
    effects.push(unfoldEffect.of({ from, to }))
  })
  if (effects.length > 0) {
    view.dispatch({ effects })
  }
}

/** Fold all foldable ranges in a single editor view */
export function foldAllInView(view: EditorView): void {
  const effects: StateEffect<{ from: number; to: number }>[] = []
  for (let i = 1; i <= view.state.doc.lines; i++) {
    const line = view.state.doc.line(i)
    const range = foldable(view.state, line.from, line.to)
    if (range) {
      effects.push(foldEffect.of(range))
    }
  }
  if (effects.length > 0) {
    view.dispatch({ effects })
  }
}

export { DiffCoordinatorImpl }
