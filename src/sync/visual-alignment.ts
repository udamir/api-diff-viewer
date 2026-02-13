/**
 * Visual Alignment for Side-by-Side Diff View
 *
 * This module generates aligned content for before/after editors,
 * inserting spacer lines to keep corresponding content at the same
 * vertical position.
 */

import { DiffBlockData } from '../diff-builder/common'
import type { LineMapping, AlignedContent } from '../types'

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

/** A diff line with change-root metadata */
type DiffLineEntry = DiffBlockData & { _isChangeRoot?: boolean }

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
function collectDiffLines(block: DiffBlockData): DiffLineEntry[] {
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
function getLineVisibility(line: DiffBlockData): { before: boolean; after: boolean } {
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

function cachedIndent(width: number): string {
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
function tokensToString(line: DiffBlockData, side: 'before' | 'after', extraIndent: number = 0): string {
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
 * Uses cached indent strings to reduce allocations.
 */
export function tokensToStringBatch(
  lines: DiffBlockData[],
  side: 'before' | 'after',
  extraIndent: number = 0
): string[] {
  const result: string[] = new Array(lines.length)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const indentWidth = Math.max(0, line.indent) + extraIndent
    const indent = cachedIndent(indentWidth)
    const parts: string[] = []

    for (const token of line.tokens) {
      const tags = token.tags || []
      if (tags.includes('collapsed')) continue

      const isBeforeOnly = tags.includes('before') && !tags.includes('after')
      const isAfterOnly = tags.includes('after') && !tags.includes('before')

      if (side === 'before' && isAfterOnly) continue
      if (side === 'after' && isBeforeOnly) continue

      const sanitizedValue = token.value.replace(/[\r\n]+/g, ' ')
      parts.push(sanitizedValue)
    }

    result[i] = indent + parts.join('')
  }

  return result
}

/**
 * Generates aligned content for side-by-side view from diff blocks.
 *
 * Uses token tags to determine which content appears on which side:
 * - Tokens tagged 'before' only: appear only on before side
 * - Tokens tagged 'after' only: appear only on after side
 * - Untagged tokens: appear on both sides
 *
 * @param diffBlocks - Diff block data array
 * @param format - Output format (for future use)
 * @returns Aligned content with spacer lines inserted
 */
export function generateAlignedContentFromDiff(
  diffBlocks: DiffBlockData[],
  format: 'json' | 'yaml',
  _beforeObj: unknown,
  _afterObj: unknown,
  options?: { wordDiffMode?: 'word' | 'char' | 'none' }
): AlignmentResult {
  // Collect all diff lines in order
  const diffLines: DiffLineEntry[] = []
  for (const block of diffBlocks) {
    diffLines.push(...collectDiffLines(block))
  }

  const beforeLines: string[] = []
  const afterLines: string[] = []
  const lineMap: LineMapping[] = []
  const beforeSpacers = new Set<number>()
  const afterSpacers = new Set<number>()
  const blockLineRanges = new Map<string, { start: number; end: number }>()

  // For JSON format, add opening brace
  if (format === 'json') {
    beforeLines.push('{')
    afterLines.push('{')
    lineMap.push({
      beforeLine: 1,
      afterLine: 1,
      type: 'unchanged',
    })
  }

  let alignedLineIndex = format === 'json' ? 1 : 0

  // Extra indent for JSON format (to account for the wrapping braces)
  const extraIndent = format === 'json' ? 2 : 0

  const wordDiffMode = options?.wordDiffMode ?? 'word'

  /** Update blockLineRanges for a given blockId at the current aligned line index */
  function trackBlockLineRange(blockId: string | undefined, lineIndex: number) {
    if (!blockId) return
    const lineNum = lineIndex + 1 // 1-based
    const existing = blockLineRanges.get(blockId)
    if (!existing) {
      blockLineRanges.set(blockId, { start: lineNum, end: lineNum })
    } else {
      existing.end = lineNum
    }
    // Propagate to ancestors
    let parentId = blockId
    while (true) {
      const slashIdx = parentId.lastIndexOf('/')
      if (slashIdx <= 0) break
      parentId = parentId.substring(0, slashIdx)
      const parentRange = blockLineRanges.get(parentId)
      if (parentRange) {
        if (lineNum > parentRange.end) parentRange.end = lineNum
        if (lineNum < parentRange.start) parentRange.start = lineNum
      } else {
        blockLineRanges.set(parentId, { start: lineNum, end: lineNum })
      }
    }
  }

  // Process each diff line
  for (const line of diffLines) {
    const action = line.diff?.action

    // When wordDiffMode is 'none', split replace/rename into separate remove + add lines.
    // Each row gets identical text on both sides (spacer uses opposite content),
    // guaranteeing identical word-wrap height regardless of content differences.
    // A shared pairId links the two rows so word-diff can reconstruct the pairing.
    if (wordDiffMode === 'none' && (action === 'replace' || action === 'rename')) {
      const actualBeforeContent = tokensToString(line, 'before', extraIndent)
      const actualAfterContent = tokensToString(line, 'after', extraIndent)
      const pairId = line.id || `pair-${alignedLineIndex}`

      // Emit removed line: content on before side, spacer on after side
      beforeLines.push(actualBeforeContent)
      afterLines.push(actualBeforeContent || SPACER_LINE) // match wrap height
      afterSpacers.add(alignedLineIndex)
      lineMap.push({
        beforeLine: alignedLineIndex + 1,
        afterLine: null,
        type: 'removed',
        blockId: line.id,
        diffType: line.diff?.type,
        isChangeRoot: line._isChangeRoot,
        pairId,
      })
      trackBlockLineRange(line.id, alignedLineIndex)
      alignedLineIndex++

      // Emit added line: spacer on before side, content on after side
      beforeLines.push(actualAfterContent || SPACER_LINE) // match wrap height
      afterLines.push(actualAfterContent)
      beforeSpacers.add(alignedLineIndex)
      lineMap.push({
        beforeLine: null,
        afterLine: alignedLineIndex + 1,
        type: 'added',
        blockId: line.id,
        diffType: line.diff?.type,
        isChangeRoot: line._isChangeRoot,
        pairId,
      })
      trackBlockLineRange(line.id, alignedLineIndex)
      alignedLineIndex++

      continue
    }

    const visibility = getLineVisibility(line)

    // Get the actual content for each side
    const actualBeforeContent = tokensToString(line, 'before', extraIndent)
    const actualAfterContent = tokensToString(line, 'after', extraIndent)

    // For spacer lines, use content from the OPPOSITE side so word-wrap matches
    // The content will be made invisible via CSS
    let beforeContent: string
    let afterContent: string

    if (visibility.before) {
      beforeContent = actualBeforeContent
    } else {
      // Spacer on before side - use after content for matching wrap height
      beforeContent = actualAfterContent || SPACER_LINE
    }

    if (visibility.after) {
      afterContent = actualAfterContent
    } else {
      // Spacer on after side - use before content for matching wrap height
      afterContent = actualBeforeContent || SPACER_LINE
    }

    beforeLines.push(beforeContent)
    afterLines.push(afterContent)

    // Track spacers
    if (!visibility.before) {
      beforeSpacers.add(alignedLineIndex)
    }
    if (!visibility.after) {
      afterSpacers.add(alignedLineIndex)
    }

    // Build line map
    let type: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged'
    if (action === 'add') type = 'added'
    else if (action === 'remove') type = 'removed'
    else if (action === 'replace' || action === 'rename') type = 'modified'

    lineMap.push({
      beforeLine: visibility.before ? alignedLineIndex + 1 : null,
      afterLine: visibility.after ? alignedLineIndex + 1 : null,
      type,
      blockId: line.id,
      diffType: line.diff?.type,
      isChangeRoot: line._isChangeRoot,
    })

    trackBlockLineRange(line.id, alignedLineIndex)
    alignedLineIndex++
  }

  // For JSON format, add closing brace
  if (format === 'json') {
    beforeLines.push('}')
    afterLines.push('}')
    lineMap.push({
      beforeLine: alignedLineIndex + 1,
      afterLine: alignedLineIndex + 1,
      type: 'unchanged',
    })
  }

  // Validate that all arrays have the same length
  if (beforeLines.length !== afterLines.length || beforeLines.length !== lineMap.length) {
    console.error('Alignment mismatch:', {
      beforeLines: beforeLines.length,
      afterLines: afterLines.length,
      lineMap: lineMap.length,
    })
  }

  // Check for embedded newlines that would cause document line count mismatch
  const beforeNewlines = beforeLines.filter(l => l.includes('\n')).length
  const afterNewlines = afterLines.filter(l => l.includes('\n')).length
  if (beforeNewlines > 0 || afterNewlines > 0) {
    console.error('Lines contain embedded newlines:', { beforeNewlines, afterNewlines })
  }

  return {
    beforeLines,
    afterLines,
    lineMap,
    beforeSpacers,
    afterSpacers,
    blockLineRanges,
  }
}

/**
 * Simplified alignment for when we just need basic before/after content
 * without proper token-based generation.
 */
export function generateAlignedContent(
  beforeContent: string,
  afterContent: string,
  diffBlocks: DiffBlockData[]
): AlignmentResult {
  // For now, just return the content as-is without alignment
  const beforeLines = beforeContent.split('\n')
  const afterLines = afterContent.split('\n')

  return {
    beforeLines,
    afterLines,
    lineMap: [],
    beforeSpacers: new Set(),
    afterSpacers: new Set(),
    blockLineRanges: new Map(),
  }
}

/**
 * Creates aligned content strings from alignment result
 */
export function alignmentToContent(alignment: AlignmentResult): AlignedContent {
  return {
    before: alignment.beforeLines.join('\n'),
    after: alignment.afterLines.join('\n'),
    lineMap: alignment.lineMap,
  }
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

/**
 * Generates unified/inline content from diff blocks.
 * Shows both before and after content in a single view:
 * - Removed lines are included and marked
 * - Added lines are included and marked
 * - Modified lines: with inlineWordDiff=true shows single line, otherwise shows remove+add
 *
 * @param diffBlocks - Diff block data array
 * @param format - Output format (for future use)
 * @param options - Generation options
 * @returns Unified content with line mappings
 */
export function generateUnifiedContentFromDiff(
  diffBlocks: DiffBlockData[],
  format: 'json' | 'yaml',
  options?: UnifiedContentOptions
): UnifiedResult {
  const inlineWordDiff = options?.inlineWordDiff ?? false

  // Collect all diff lines in order
  const diffLines: DiffLineEntry[] = []
  for (const block of diffBlocks) {
    diffLines.push(...collectDiffLines(block))
  }

  const lines: string[] = []
  const lineMap: LineMapping[] = []
  const beforeContentMap = new Map<number, string>()

  let lineIndex = 0

  // For JSON format, add opening brace
  if (format === 'json') {
    lines.push('{')
    lineMap.push({
      beforeLine: 1,
      afterLine: 1,
      type: 'unchanged',
    })
    lineIndex++
  }

  // Extra indent for JSON format (to account for the wrapping braces)
  const extraIndent = format === 'json' ? 2 : 0

  // Process each diff line
  for (const line of diffLines) {
    const action = line.diff?.action

    // Get content for both sides
    const beforeContent = tokensToString(line, 'before', extraIndent)
    const afterContent = tokensToString(line, 'after', extraIndent)

    // Determine the type
    let type: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged'
    if (action === 'add') type = 'added'
    else if (action === 'remove') type = 'removed'
    else if (action === 'replace' || action === 'rename') type = 'modified'

    // For unified view, show appropriate content based on action
    if (action === 'remove') {
      // Show removed content
      lines.push(beforeContent)
      lineMap.push({
        beforeLine: lineIndex + 1,
        afterLine: null,
        type: 'removed',
        blockId: line.id,
        diffType: line.diff?.type,
        isChangeRoot: line._isChangeRoot,
      })
      lineIndex++
    } else if (action === 'add') {
      // Show added content
      lines.push(afterContent)
      lineMap.push({
        beforeLine: null,
        afterLine: lineIndex + 1,
        type: 'added',
        blockId: line.id,
        diffType: line.diff?.type,
        isChangeRoot: line._isChangeRoot,
      })
      lineIndex++
    } else if (action === 'replace' || action === 'rename') {
      if (inlineWordDiff) {
        // Show single line with after content, store before for word diff
        lines.push(afterContent)
        beforeContentMap.set(lineIndex, beforeContent)
        lineMap.push({
          beforeLine: lineIndex + 1,
          afterLine: lineIndex + 1,
          type: 'modified',
          blockId: line.id,
          diffType: line.diff?.type,
          isChangeRoot: line._isChangeRoot,
        })
        lineIndex++
      } else {
        // Traditional mode: show both old and new on separate lines
        // First show the removed (old) version
        lines.push(beforeContent)
        lineMap.push({
          beforeLine: lineIndex + 1,
          afterLine: null,
          type: 'removed',
          blockId: line.id,
          diffType: line.diff?.type,
          isChangeRoot: line._isChangeRoot,
        })
        lineIndex++

        // Then show the added (new) version
        lines.push(afterContent)
        lineMap.push({
          beforeLine: null,
          afterLine: lineIndex + 1,
          type: 'added',
          blockId: line.id,
          diffType: line.diff?.type,
          isChangeRoot: line._isChangeRoot,
        })
        lineIndex++
      }
    } else {
      // Unchanged - show as-is
      lines.push(afterContent)
      lineMap.push({
        beforeLine: lineIndex + 1,
        afterLine: lineIndex + 1,
        type: 'unchanged',
        blockId: line.id,
        diffType: line.diff?.type,
        isChangeRoot: line._isChangeRoot,
      })
      lineIndex++
    }
  }

  // For JSON format, add closing brace
  if (format === 'json') {
    lines.push('}')
    lineMap.push({
      beforeLine: lineIndex + 1,
      afterLine: lineIndex + 1,
      type: 'unchanged',
    })
  }

  return {
    lines,
    lineMap,
    beforeContentMap: beforeContentMap.size > 0 ? beforeContentMap : undefined,
  }
}
