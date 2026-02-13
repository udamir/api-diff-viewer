import { diffTypes } from '../diff-builder/common'
import type { DiffBlockData } from '../diff-builder/common'
import type { DiffType } from 'api-smart-diff'
import type { BlockTreeIndex } from './block-index'

/**
 * Returns true if a block (or any of its descendants) contains at least
 * one change whose type is in `filters`. Returns true for all blocks
 * when filters is empty (no filtering).
 */
export function blockMatchesFilter(block: DiffBlockData, filters: DiffType[]): boolean {
  if (filters.length === 0) return true

  for (const filterType of filters) {
    const idx = diffTypes.indexOf(filterType)
    if (idx >= 0 && block.diffs[idx] > 0) return true
  }
  return false
}

/**
 * Given the block tree and active filters, returns the set of block IDs
 * that should be folded (collapsed). Blocks matching the filter are excluded
 * from the fold set. Blocks not matching are included.
 *
 * Only considers foldable blocks (those with children).
 * When filters is empty, returns empty set (nothing folded by filter).
 */
export function computeFilterFoldSet(
  blocks: DiffBlockData[],
  filters: DiffType[]
): Set<string> {
  const foldSet = new Set<string>()
  if (filters.length === 0) return foldSet

  const walk = (blockList: DiffBlockData[]) => {
    for (const block of blockList) {
      if (block.children.length > 0) {
        if (block.id && !blockMatchesFilter(block, filters)) {
          foldSet.add(block.id)
        }
        // Always walk children — a parent may not match but a sibling subtree might,
        // and the root block has no id so we must recurse through it unconditionally
        walk(block.children)
      }
    }
  }

  walk(blocks)
  return foldSet
}

/**
 * Index-driven version of computeFilterFoldSet.
 * Uses pre-computed containersByMatchingType for O(M) set operations
 * instead of O(N) tree walk.
 */
export function computeFilterFoldSetFromIndex(
  index: BlockTreeIndex,
  filters: DiffType[]
): Set<string> {
  if (filters.length === 0) return new Set()

  // Start with ALL containers, then remove those that match any filter type
  const foldSet = new Set(index.containerIds)

  for (const filterType of filters) {
    const matching = index.containersByMatchingType.get(filterType)
    if (matching) {
      for (const id of matching) {
        foldSet.delete(id)
      }
    }
  }

  return foldSet
}
