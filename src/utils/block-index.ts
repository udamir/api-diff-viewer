/**
 * Block Tree Index — Pre-computed index for fast lookups on the diff block tree.
 *
 * Built once after buildDiffBlock(), consumed by all extensions that previously
 * walked the tree independently. Provides O(1) lookups for block metadata,
 * ancestor chains, change lists, and filter operations.
 */

import type { DiffType } from 'api-smart-diff'
import type { DiffBlockData } from '../diff-builder/common'
import { diffTypes } from '../diff-builder/common'

/** Pre-computed index entry for a block */
export interface BlockIndexEntry {
  block: DiffBlockData
  parentId: string | null
  depth: number
  /** Aggregate classification counts (mirrors block.diffs) */
  counts: { breaking: number; nonBreaking: number; annotation: number; unclassified: number }
  /** Direct diff type if block has a change */
  diffType?: DiffType
  /** All ancestor block IDs from root to parent */
  ancestorIds: string[]
}

/** Pre-computed index for the entire block tree */
export interface BlockTreeIndex {
  /** blockId → entry (O(1) lookup) */
  byId: Map<string, BlockIndexEntry>
  /** All container block IDs (have children), for filter operations */
  containerIds: string[]
  /** Container blocks grouped by which diff types they contain */
  containersByMatchingType: Map<DiffType, Set<string>>
  /** Container blocks that match NO diff type (no changes at all) */
  unchangedContainers: Set<string>
  /** All blocks with direct changes, sorted by document order */
  changedBlocks: { blockId: string; diffType: DiffType; block: DiffBlockData }[]
  /** Changed blocks grouped by type, sorted by document order */
  changedByType: Map<DiffType, { blockId: string; block: DiffBlockData }[]>
}

/**
 * Build the block tree index. Called once after buildDiffBlock().
 * O(N) where N = total nodes in the tree.
 */
export function buildBlockTreeIndex(blocks: DiffBlockData[]): BlockTreeIndex {
  const byId = new Map<string, BlockIndexEntry>()
  const containerIds: string[] = []
  const containersByMatchingType = new Map<DiffType, Set<string>>()
  const unchangedContainers = new Set<string>()
  const changedBlocks: BlockTreeIndex['changedBlocks'] = []
  const changedByType = new Map<DiffType, { blockId: string; block: DiffBlockData }[]>()

  // Initialize type maps
  for (const dt of diffTypes) {
    containersByMatchingType.set(dt, new Set())
    changedByType.set(dt, [])
  }

  function walk(block: DiffBlockData, parentId: string | null, ancestorIds: string[], depth: number) {
    const entry: BlockIndexEntry = {
      block,
      parentId,
      depth,
      counts: {
        breaking: block.diffs[0],
        nonBreaking: block.diffs[1],
        annotation: block.diffs[2],
        unclassified: block.diffs[3],
      },
      diffType: block.diff?.type,
      ancestorIds: [...ancestorIds],
    }
    if (block.id) {
      byId.set(block.id, entry)
    }

    // Track changed blocks
    if (block.diff && block.id) {
      changedBlocks.push({ blockId: block.id, diffType: block.diff.type, block })
      changedByType.get(block.diff.type)!.push({ blockId: block.id, block })
    }

    // Track containers
    if (block.children.length > 0 && block.id) {
      containerIds.push(block.id)

      let hasAnyChange = false
      for (let i = 0; i < diffTypes.length; i++) {
        if (block.diffs[i] > 0) {
          containersByMatchingType.get(diffTypes[i])!.add(block.id)
          hasAnyChange = true
        }
      }
      if (!hasAnyChange) {
        unchangedContainers.add(block.id)
      }
    }

    const childAncestors = block.id ? [...ancestorIds, block.id] : ancestorIds
    for (const child of block.children) {
      walk(child, block.id || parentId, childAncestors, depth + 1)
    }
  }

  for (const block of blocks) {
    walk(block, null, [], 0)
  }

  return { byId, containerIds, containersByMatchingType, unchangedContainers, changedBlocks, changedByType }
}
