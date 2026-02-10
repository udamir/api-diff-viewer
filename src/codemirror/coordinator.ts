import { EditorView } from '@codemirror/view'
import type { DiffType } from 'api-smart-diff'
import type { DiffBlockData } from '../diff-builder/common'
import type {
  DiffData,
  DiffConfig,
  DiffCoordinator,
  DiffPairResult,
  NavigationOptions,
  NavigationAPI,
} from './types'
import { createNavigationAPI, NavigationAPIImpl } from './navigation/navigation-api'
import {
  setExpandedBlocksEffect,
  toggleBlockExpandedEffect,
  setDiffDataEffect,
} from './state/diff-state'

/** Implementation of the DiffCoordinator */
class DiffCoordinatorImpl implements DiffCoordinator {
  private _beforeView: EditorView
  private _afterView: EditorView
  private _navigation: NavigationAPIImpl
  private _diffData: DiffData

  constructor(beforeView: EditorView, afterView: EditorView, diffData: DiffData) {
    this._beforeView = beforeView
    this._afterView = afterView
    this._diffData = diffData
    this._navigation = new NavigationAPIImpl(beforeView, afterView, diffData)
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

  goToBlock(blockId: string, options?: NavigationOptions): void {
    this._navigation.goToBlock(blockId, options)
  }

  goToNextChange(filter?: DiffType[]): DiffBlockData | null {
    return this._navigation.goToNextChange(filter)
  }

  goToPrevChange(filter?: DiffType[]): DiffBlockData | null {
    return this._navigation.goToPrevChange(filter)
  }

  expandAll(): void {
    const allBlockIds = this.collectBlockIds(this._diffData.blocks)
    const expandedSet = new Set(allBlockIds)

    this._beforeView.dispatch({
      effects: setExpandedBlocksEffect.of(expandedSet),
    })
    this._afterView.dispatch({
      effects: setExpandedBlocksEffect.of(expandedSet),
    })
  }

  collapseAll(): void {
    this._beforeView.dispatch({
      effects: setExpandedBlocksEffect.of(new Set()),
    })
    this._afterView.dispatch({
      effects: setExpandedBlocksEffect.of(new Set()),
    })
  }

  toggleBlock(blockId: string): void {
    this._beforeView.dispatch({
      effects: toggleBlockExpandedEffect.of(blockId),
    })
    this._afterView.dispatch({
      effects: toggleBlockExpandedEffect.of(blockId),
    })
  }

  updateDiffData(newData: DiffData): void {
    this._diffData = newData
    this._navigation.update(this._beforeView, this._afterView, newData)

    this._beforeView.dispatch({
      effects: setDiffDataEffect.of(newData),
    })
    this._afterView.dispatch({
      effects: setDiffDataEffect.of(newData),
    })
  }

  destroy(): void {
    this._beforeView.destroy()
    this._afterView.destroy()
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

/** Create a coordinator for a diff pair */
export function createCoordinator(
  beforeView: EditorView,
  afterView: EditorView,
  diffData: DiffData
): DiffCoordinator {
  return new DiffCoordinatorImpl(beforeView, afterView, diffData)
}

export { DiffCoordinatorImpl }
