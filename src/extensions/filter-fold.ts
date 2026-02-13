/**
 * Filter-as-Folding — Applies fold/unfold effects based on active filters.
 *
 * When filters are active, blocks that don't contain matching change types
 * are folded (collapsed), while blocks that match remain expanded.
 */

import { foldEffect, unfoldEffect, foldable, foldedRanges } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import type { DiffBlockData } from '../diff-builder/common'
import type { DiffType } from 'api-smart-diff'
import { computeFilterFoldSet, computeFilterFoldSetFromIndex } from '../utils/filter'
import type { BlockTreeIndex } from '../utils/block-index'
import { setFilterFoldsEffect, getDiffState } from '../state/diff-state'
import { lineMappingsField } from './aligned-decorations'

/**
 * Build a map from block ID to editor line range (1-based).
 *
 * Uses the lineMap from visual alignment (stored in editor state) which
 * correctly accounts for spacer lines in side-by-side mode. Records the
 * first line (start) and last line (end) of each block's span, including
 * all descendant lines. Descendants are detected via blockId prefix matching
 * (e.g., "paths/~1pets" is a descendant of "paths").
 */
function buildBlockEditorLineRanges(view: EditorView): Map<string, { start: number; end: number }> {
  const ranges = new Map<string, { start: number; end: number }>()
  const { mappings } = view.state.field(lineMappingsField)

  for (let i = 0; i < mappings.length; i++) {
    const blockId = mappings[i].blockId
    if (!blockId) continue

    const lineNum = i + 1 // editor lines are 1-based

    // Update this block's own range
    const existing = ranges.get(blockId)
    if (!existing) {
      ranges.set(blockId, { start: lineNum, end: lineNum })
    } else {
      existing.end = lineNum
    }

    // Update all ancestor ranges — a line belonging to "paths/~1pets/get"
    // extends the range of "paths/~1pets" and "paths".
    // Also creates range entries for ancestors that have no direct editor line
    // (e.g., YAML array container blocks with no tokens).
    let parentId = blockId
    while (true) {
      const slashIdx = parentId.lastIndexOf('/')
      if (slashIdx <= 0) break
      parentId = parentId.substring(0, slashIdx)
      const parentRange = ranges.get(parentId)
      if (parentRange) {
        if (lineNum < parentRange.start) parentRange.start = lineNum
        if (lineNum > parentRange.end) parentRange.end = lineNum
      } else {
        // Parent has no direct line (e.g., YAML array item container) —
        // derive its range from descendant lines
        ranges.set(parentId, { start: lineNum, end: lineNum })
      }
    }
  }

  return ranges
}

/**
 * Find the foldable range for a block by its editor line number (1-based).
 * Tries the language service's foldable() first, then falls back to computing
 * the range from the lineMap (block start line to block end line).
 */
function findFoldRangeForBlock(
  view: EditorView,
  editorLine: number,
  blockEndLine?: number
): { from: number; to: number } | null {
  const doc = view.state.doc
  if (editorLine < 1 || editorLine > doc.lines) return null

  const line = doc.line(editorLine)

  // Try language-based folding first (most accurate for brace/indent matching)
  const langRange = foldable(view.state, line.from, line.to)
  if (langRange) return langRange

  // Fallback: compute range from lineMap block span
  if (blockEndLine && blockEndLine > editorLine && blockEndLine <= doc.lines) {
    const endLine = doc.line(blockEndLine)
    return { from: line.to, to: endLine.to }
  }

  return null
}

/**
 * Find the currently folded range at a block's editor line number.
 * For unfolding we must match the exact range that was folded.
 */
function findFoldedRangeForBlock(
  view: EditorView,
  editorLine: number
): { from: number; to: number } | null {
  const doc = view.state.doc
  if (editorLine < 1 || editorLine > doc.lines) return null

  const line = doc.line(editorLine)
  const folded = foldedRanges(view.state)

  let result: { from: number; to: number } | null = null
  folded.between(line.from, line.to, (from, to) => {
    result = { from, to }
  })
  return result
}

/**
 * Apply filter-based folding to an editor view.
 * Folds blocks that don't match the filter; unfolds blocks that do.
 *
 * When treeIndex and pre-computed blockLineRanges are provided, uses
 * O(M) set operations instead of O(N) tree walk and lineMap scan.
 */
export function applyFilterFolds(
  view: EditorView,
  blocks: DiffBlockData[],
  filters: DiffType[],
  precomputedBlockLineRanges?: Map<string, { start: number; end: number }>,
  treeIndex?: BlockTreeIndex
): void {
  const newFoldSet = treeIndex
    ? computeFilterFoldSetFromIndex(treeIndex, filters)
    : computeFilterFoldSet(blocks, filters)
  const state = getDiffState(view.state)
  const prevFoldSet = state.filterFoldedBlocks

  const blockRanges = precomputedBlockLineRanges || buildBlockEditorLineRanges(view)
  const effects = []

  // Blocks to fold: in newFoldSet but not previously folded by filter
  for (const blockId of newFoldSet) {
    if (!prevFoldSet.has(blockId)) {
      const lineRange = blockRanges.get(blockId)
      if (lineRange) {
        const range = findFoldRangeForBlock(view, lineRange.start, lineRange.end)
        if (range) {
          effects.push(foldEffect.of(range))
        }
      }
    }
  }

  // Blocks to unfold: in prevFoldSet but not in newFoldSet
  for (const blockId of prevFoldSet) {
    if (!newFoldSet.has(blockId)) {
      const lineRange = blockRanges.get(blockId)
      if (lineRange) {
        const range = findFoldedRangeForBlock(view, lineRange.start)
        if (range) {
          effects.push(unfoldEffect.of(range))
        }
      }
    }
  }

  // Track the new filter fold set
  effects.push(setFilterFoldsEffect.of(newFoldSet))

  if (effects.length > 0) {
    view.dispatch({ effects })
  }
}
