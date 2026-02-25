/**
 * Shared types, constants, and helpers for visual alignment.
 */

import { DiffBlockData } from '../diff-builder/common'
import type { LineMapping } from '../types'

/**
 * Marker for spacer lines.
 * Using multiple spaces to ensure the line renders with proper height.
 * The content will be hidden via CSS (color: transparent).
 */
export const SPACER_LINE = '\u00A0\u00A0\u00A0\u00A0'

/** Result of alignment process */
export interface AlignmentResult {
  beforeLines: string[]
  afterLines: string[]
  lineMap: LineMapping[]
  /** Line numbers that are spacers (0-indexed) */
  beforeSpacers: Set<number>
  afterSpacers: Set<number>
  /** Pre-computed: blockId → {start, end} editor line ranges (1-based) */
  blockLineRanges: Map<string, { start: number; end: number }>
}

/** Result of unified content generation */
export interface UnifiedResult {
  lines: string[]
  lineMap: LineMapping[]
  /** For word diff mode: before content for each line (only for modified lines) */
  beforeContentMap?: Map<number, string>
}

/** Options for unified content generation */
export interface UnifiedContentOptions {
  /** If true, modified lines show single line with word diff instead of remove+add */
  inlineWordDiff?: boolean
}

/** A diff line with change-root metadata */
export type DiffLineEntry = DiffBlockData & { _isChangeRoot?: boolean }

/**
 * Collects all diff lines from a block tree into a flat array.
 * Tracks whether each line is the root of a logical change
 * (i.e. its parent is NOT already part of a change that subsumes it).
 *
 * Only `add` and `remove` actions subsume their children — an added/removed
 * block is one logical change regardless of how many nested lines it has.
 * `rename` and `replace` do NOT suppress children because they change
 * the key/value independently of the nested content's own changes.
 */
export function collectDiffLines(block: DiffBlockData): DiffLineEntry[] {
  const lines: DiffLineEntry[] = []

  const collect = (b: DiffBlockData, parentHasDiff: boolean) => {
    if (b.tokens.length > 0) {
      const entry = b as DiffLineEntry
      entry._isChangeRoot = !!b.diff && !parentHasDiff
      lines.push(entry)
    }
    // Only propagate parentHasDiff for add/remove (those subsume children).
    // Rename/replace are independent of their children's changes.
    const action = b.diff?.action
    const subsumesChildren = action === 'add' || action === 'remove'
    const insideChange = parentHasDiff || (!!b.diff && subsumesChildren)
    for (const child of b.children) {
      collect(child, insideChange)
    }
  }

  collect(block, false)
  return lines
}

/**
 * Determines line visibility based on diff action
 */
export function getLineVisibility(line: DiffBlockData): { before: boolean; after: boolean } {
  const action = line.diff?.action

  // Use diff action to determine visibility
  if (action === 'add') {
    // Added lines only appear on the after side
    return { before: false, after: true }
  } else if (action === 'remove') {
    // Removed lines only appear on the before side
    return { before: true, after: false }
  } else {
    // All other lines (unchanged, modified/replace, rename) appear on both sides
    return { before: true, after: true }
  }
}

/** Cache for indent strings — avoids re-allocating for common indent levels */
const indentCache = new Map<number, string>()

export function cachedIndent(width: number): string {
  let cached = indentCache.get(width)
  if (cached === undefined) {
    cached = ' '.repeat(width)
    indentCache.set(width, cached)
  }
  return cached
}

/**
 * Converts tokens to a string for a specific side.
 * Replaces newlines with spaces to ensure one logical line = one document line.
 *
 * Note: line.indent is in single-space units (not pairs), so we use ' '.repeat()
 * not '  '.repeat(). The diff builder uses indent values like 0, 2, 4 where
 * each unit represents one space of indentation.
 *
 * @param line - The diff block data
 * @param side - Which side to generate content for
 * @param extraIndent - Additional indentation to add (e.g., for JSON wrapper)
 */
export function tokensToString(line: DiffBlockData, side: 'before' | 'after', extraIndent: number = 0): string {
  const indent = cachedIndent(Math.max(0, line.indent) + extraIndent)
  const parts: string[] = []

  for (const token of line.tokens) {
    const tags = token.tags || []

    // Skip collapsed/expanded markers
    if (tags.includes('collapsed')) continue

    // Check if this token should appear on this side
    const isBeforeOnly = tags.includes('before') && !tags.includes('after')
    const isAfterOnly = tags.includes('after') && !tags.includes('before')

    if (side === 'before' && isAfterOnly) continue
    if (side === 'after' && isBeforeOnly) continue

    // Replace all line-ending characters with spaces to keep one line per mapping entry
    const sanitizedValue = token.value.replace(/[\r\n]+/g, ' ')
    parts.push(sanitizedValue)
  }

  return indent + parts.join('')
}

/**
 * Batch convert a list of DiffBlockData lines to before/after string arrays.
 * Delegates to tokensToString for each line.
 */
export function tokensToStringBatch(
  lines: DiffBlockData[],
  side: 'before' | 'after',
  extraIndent: number = 0
): string[] {
  return lines.map(line => tokensToString(line, side, extraIndent))
}
