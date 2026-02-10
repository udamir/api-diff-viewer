/**
 * Word-Level Diff Highlighting Extension
 *
 * Provides character/word-level highlighting within modified lines
 * to show exactly what changed between before and after versions.
 */

import {
  Extension,
  StateField,
  StateEffect,
  RangeSetBuilder,
} from '@codemirror/state'
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import { diffWords, diffChars, Change } from 'diff'
import type { LineMapping } from '../types'

/** Word diff data for a line */
export interface WordDiffData {
  lineNumber: number
  ranges: WordDiffRange[]
}

/** A range within a line that was changed */
export interface WordDiffRange {
  from: number // Offset from line start
  to: number
  type: 'added' | 'removed'
}

/** Effect to set word diff data */
export const setWordDiffDataEffect = StateEffect.define<WordDiffData[]>()

/** State field for word diff data */
export const wordDiffDataField = StateField.define<WordDiffData[]>({
  create() {
    return []
  },
  update(data, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setWordDiffDataEffect)) {
        return effect.value
      }
    }
    return data
  },
})

/** Decorations for word-level changes */
const addedTextDecoration = Decoration.mark({ class: 'cm-diff-word-added' })
const removedTextDecoration = Decoration.mark({ class: 'cm-diff-word-removed' })

/** Build word diff decorations */
function buildWordDiffDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const data = view.state.field(wordDiffDataField, false) || []
  const doc = view.state.doc

  for (const lineData of data) {
    if (lineData.lineNumber > 0 && lineData.lineNumber <= doc.lines) {
      try {
        const line = doc.line(lineData.lineNumber)

        for (const range of lineData.ranges) {
          const from = line.from + range.from
          const to = line.from + range.to

          // Ensure ranges are within bounds
          if (from >= line.from && to <= line.to && from < to) {
            const decoration = range.type === 'added'
              ? addedTextDecoration
              : removedTextDecoration
            builder.add(from, to, decoration)
          }
        }
      } catch {
        // Line doesn't exist
      }
    }
  }

  return builder.finish()
}

/** View plugin for word diff decorations */
const wordDiffPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildWordDiffDecorations(view)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.transactions.some(tr =>
          tr.effects.some(e => e.is(setWordDiffDataEffect))
        )
      ) {
        this.decorations = buildWordDiffDecorations(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
)

/**
 * Compute word-level diff between two strings.
 * Returns ranges of changes within each string.
 */
export function computeWordDiff(
  before: string,
  after: string,
  mode: 'word' | 'char' = 'word'
): { beforeRanges: WordDiffRange[]; afterRanges: WordDiffRange[] } {
  const diffFn = mode === 'word' ? diffWords : diffChars
  const changes = diffFn(before, after)

  const beforeRanges: WordDiffRange[] = []
  const afterRanges: WordDiffRange[] = []

  let beforeOffset = 0
  let afterOffset = 0

  for (const change of changes) {
    const length = change.value.length

    if (change.removed) {
      // Removed from before
      beforeRanges.push({
        from: beforeOffset,
        to: beforeOffset + length,
        type: 'removed',
      })
      beforeOffset += length
    } else if (change.added) {
      // Added to after
      afterRanges.push({
        from: afterOffset,
        to: afterOffset + length,
        type: 'added',
      })
      afterOffset += length
    } else {
      // Unchanged - advance both offsets
      beforeOffset += length
      afterOffset += length
    }
  }

  return { beforeRanges, afterRanges }
}

/**
 * Build word diff data for modified lines.
 *
 * @param lineMap - Line mappings with before/after correspondence
 * @param beforeLines - Content of before lines
 * @param afterLines - Content of after lines
 * @param side - Which side to generate data for
 * @param mode - Diff mode ('word' or 'char')
 */
export function buildWordDiffData(
  lineMap: LineMapping[],
  beforeLines: string[],
  afterLines: string[],
  side: 'before' | 'after',
  mode: 'word' | 'char' = 'word'
): WordDiffData[] {
  const result: WordDiffData[] = []

  for (let i = 0; i < lineMap.length; i++) {
    const mapping = lineMap[i]

    // Only process modified lines (not added or removed)
    if (mapping.type !== 'modified') continue

    const beforeLine = beforeLines[i] || ''
    const afterLine = afterLines[i] || ''

    // Skip if either line is empty or they're identical
    if (!beforeLine || !afterLine || beforeLine === afterLine) continue

    const { beforeRanges, afterRanges } = computeWordDiff(beforeLine, afterLine, mode)

    const ranges = side === 'before' ? beforeRanges : afterRanges
    if (ranges.length > 0) {
      result.push({
        lineNumber: i + 1,
        ranges,
      })
    }
  }

  return result
}

/**
 * Build word diff data from before/after content strings for modified lines.
 * Uses a simpler approach when we have line-by-line content.
 */
export function buildWordDiffDataFromContent(
  lineMap: LineMapping[],
  beforeContent: string,
  afterContent: string,
  side: 'before' | 'after',
  mode: 'word' | 'char' = 'word'
): WordDiffData[] {
  const beforeLines = beforeContent.split('\n')
  const afterLines = afterContent.split('\n')

  return buildWordDiffData(lineMap, beforeLines, afterLines, side, mode)
}

/**
 * Build word diff data for inline/unified view where modified lines
 * show inline changes. Uses beforeContentMap from generateUnifiedContentFromDiff.
 *
 * @param lines - The unified content lines
 * @param lineMap - Line mappings
 * @param beforeContentMap - Map of line index to before content for modified lines
 * @param mode - Diff mode ('word' or 'char')
 */
export function buildInlineWordDiffData(
  lines: string[],
  lineMap: LineMapping[],
  beforeContentMap: Map<number, string>,
  mode: 'word' | 'char' = 'word'
): WordDiffData[] {
  const result: WordDiffData[] = []

  for (let i = 0; i < lineMap.length; i++) {
    const mapping = lineMap[i]

    // Only process modified lines that have before content
    if (mapping.type !== 'modified') continue

    const beforeContent = beforeContentMap.get(i)
    if (beforeContent === undefined) continue

    const afterContent = lines[i] || ''

    // Skip if they're identical
    if (beforeContent === afterContent) continue

    const { afterRanges } = computeWordDiff(beforeContent, afterContent, mode)

    // For inline view, we show the "after" content with highlights
    // Both added parts (green) and the context of what was removed needs special handling
    // We'll show: added text highlighted, removed text shown with strikethrough decoration

    // Compute which parts were added vs removed
    const { beforeRanges } = computeWordDiff(beforeContent, afterContent, mode)

    // Combine both: we need to show removed text inline with after content
    // This requires widget decorations for removed text, which is more complex
    // For now, just highlight the added portions in the after text
    if (afterRanges.length > 0) {
      result.push({
        lineNumber: i + 1,
        ranges: afterRanges,
      })
    }
  }

  return result
}

/** Theme for word-level diff highlighting */
export const wordDiffTheme = EditorView.baseTheme({
  '.cm-diff-word-added': {
    backgroundColor: 'var(--diff-word-added-bg, rgba(46, 160, 67, 0.4))',
    borderRadius: '2px',
    padding: '0 1px',
  },
  '.cm-diff-word-removed': {
    backgroundColor: 'var(--diff-word-removed-bg, rgba(248, 81, 73, 0.4))',
    textDecoration: 'line-through',
    textDecorationColor: 'var(--diff-word-removed-strike, rgba(248, 81, 73, 0.8))',
    borderRadius: '2px',
    padding: '0 1px',
  },
  // Dark mode
  '&dark .cm-diff-word-added': {
    backgroundColor: 'var(--diff-word-added-bg, rgba(46, 160, 67, 0.5))',
  },
  '&dark .cm-diff-word-removed': {
    backgroundColor: 'var(--diff-word-removed-bg, rgba(248, 81, 73, 0.5))',
    textDecorationColor: 'var(--diff-word-removed-strike, rgba(248, 81, 73, 0.9))',
  },
})

/** Create the word diff extension */
export function wordDiff(): Extension {
  return [
    wordDiffDataField,
    wordDiffPlugin,
    wordDiffTheme,
  ]
}

export { diffWords, diffChars }
