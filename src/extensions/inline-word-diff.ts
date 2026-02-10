/**
 * Inline Word Diff Extension
 *
 * Shows word-level changes inline on the same line:
 * - Removed text: shown with strikethrough + red styling (as inline widgets)
 * - Added text: highlighted with green background
 *
 * Example: "old title" → "new title" displays as:
 * "~old~ new title" where ~old~ is struck through in red
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
  WidgetType,
} from '@codemirror/view'
import { diffWords, diffChars, Change } from 'diff'
import type { LineMapping } from '../types'

/** Data for inline word diff on a line */
export interface InlineWordDiffLine {
  lineNumber: number
  /** The before content for this line */
  beforeContent: string
  /** The after content (what's displayed in the document) */
  afterContent: string
}

/** Effect to set inline word diff data */
export const setInlineWordDiffEffect = StateEffect.define<InlineWordDiffLine[]>()

/** State field for inline word diff data */
export const inlineWordDiffField = StateField.define<InlineWordDiffLine[]>({
  create() {
    return []
  },
  update(data, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setInlineWordDiffEffect)) {
        return effect.value
      }
    }
    return data
  },
})

/** Widget to show removed text inline */
class RemovedTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super()
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-inline-diff-removed'
    span.textContent = this.text
    span.title = 'Removed'
    return span
  }

  eq(other: WidgetType): boolean {
    return other instanceof RemovedTextWidget && other.text === this.text
  }

  ignoreEvent(): boolean {
    return true
  }
}

/**
 * Compute the length of the common leading whitespace prefix.
 */
function commonIndentLength(a: string, b: string): number {
  const len = Math.min(a.length, b.length)
  let i = 0
  while (i < len && a[i] === ' ' && b[i] === ' ') i++
  return i
}

/** Compute decorations for a single line with inline word diff */
function computeLineDecorations(
  lineFrom: number,
  beforeContent: string,
  afterContent: string,
  mode: 'word' | 'char',
  builder: RangeSetBuilder<Decoration>
): void {
  // Strip common leading whitespace before diffing so that
  // diffWords doesn't lump the indent into a single changed token
  // when only one "word" follows (e.g. "    photoUrl:" vs "    imageUrl:").
  const skip = commonIndentLength(beforeContent, afterContent)
  const beforeTrimmed = beforeContent.slice(skip)
  const afterTrimmed = afterContent.slice(skip)

  const diffFn = mode === 'word' ? diffWords : diffChars
  const changes = diffFn(beforeTrimmed, afterTrimmed)

  let afterOffset = skip // start past the shared indent

  for (const change of changes) {
    if (change.removed) {
      // Insert widget for removed text at current position
      const widget = new RemovedTextWidget(change.value)
      const decoration = Decoration.widget({
        widget,
        side: -1, // Before the position
      })
      builder.add(lineFrom + afterOffset, lineFrom + afterOffset, decoration)
    } else if (change.added) {
      // Highlight added text
      const from = lineFrom + afterOffset
      const to = from + change.value.length
      const decoration = Decoration.mark({ class: 'cm-inline-diff-added' })
      builder.add(from, to, decoration)
      afterOffset += change.value.length
    } else {
      // Unchanged - just advance position
      afterOffset += change.value.length
    }
  }
}

/** Configuration for inline word diff */
export interface InlineWordDiffConfig {
  mode: 'word' | 'char'
}

/** State field for config */
export const inlineWordDiffConfigField = StateField.define<InlineWordDiffConfig>({
  create() {
    return { mode: 'word' }
  },
  update(config, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setInlineWordDiffConfigEffect)) {
        return effect.value
      }
    }
    return config
  },
})

export const setInlineWordDiffConfigEffect = StateEffect.define<InlineWordDiffConfig>()

/** Build decorations from inline word diff data */
function buildInlineWordDiffDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const data = view.state.field(inlineWordDiffField, false) || []
  const config = view.state.field(inlineWordDiffConfigField, false) || { mode: 'word' }
  const doc = view.state.doc

  // Sort by line number to maintain builder order
  const sortedData = [...data].sort((a, b) => a.lineNumber - b.lineNumber)

  for (const lineData of sortedData) {
    if (lineData.lineNumber > 0 && lineData.lineNumber <= doc.lines) {
      try {
        const line = doc.line(lineData.lineNumber)
        computeLineDecorations(
          line.from,
          lineData.beforeContent,
          lineData.afterContent,
          config.mode,
          builder
        )
      } catch {
        // Line doesn't exist
      }
    }
  }

  return builder.finish()
}

/** View plugin for inline word diff decorations */
const inlineWordDiffPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildInlineWordDiffDecorations(view)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.transactions.some(tr =>
          tr.effects.some(e =>
            e.is(setInlineWordDiffEffect) ||
            e.is(setInlineWordDiffConfigEffect)
          )
        )
      ) {
        this.decorations = buildInlineWordDiffDecorations(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
)

/** Theme for inline word diff */
export const inlineWordDiffTheme = EditorView.baseTheme({
  '.cm-inline-diff-removed': {
    backgroundColor: 'var(--diff-inline-removed-bg, rgba(255, 129, 130, 0.4))',
    color: 'var(--diff-inline-removed-color, #cf222e)',
    textDecoration: 'line-through',
    borderRadius: '2px',
    padding: '0 2px',
    marginRight: '1px',
  },
  '.cm-inline-diff-added': {
    backgroundColor: 'var(--diff-inline-added-bg, rgba(46, 160, 67, 0.4))',
    borderRadius: '2px',
    padding: '0 1px',
  },
  // Dark mode
  '&dark .cm-inline-diff-removed': {
    backgroundColor: 'var(--diff-inline-removed-bg, rgba(248, 81, 73, 0.5))',
    color: 'var(--diff-inline-removed-color, #ff7b72)',
  },
  '&dark .cm-inline-diff-added': {
    backgroundColor: 'var(--diff-inline-added-bg, rgba(46, 160, 67, 0.5))',
  },
})

/**
 * Build inline word diff data from unified content with beforeContentMap.
 */
export function buildInlineWordDiffLines(
  lines: string[],
  lineMap: LineMapping[],
  beforeContentMap: Map<number, string>
): InlineWordDiffLine[] {
  const result: InlineWordDiffLine[] = []

  for (let i = 0; i < lineMap.length; i++) {
    const mapping = lineMap[i]

    // Only process modified lines that have before content
    if (mapping.type !== 'modified') continue

    const beforeContent = beforeContentMap.get(i)
    if (beforeContent === undefined) continue

    const afterContent = lines[i] || ''

    // Skip if they're identical
    if (beforeContent === afterContent) continue

    result.push({
      lineNumber: i + 1,
      beforeContent,
      afterContent,
    })
  }

  return result
}

/** Create the inline word diff extension */
export function inlineWordDiff(config?: Partial<InlineWordDiffConfig>): Extension {
  const initialConfig: InlineWordDiffConfig = {
    mode: config?.mode ?? 'word',
  }

  return [
    inlineWordDiffField,
    inlineWordDiffConfigField.init(() => initialConfig),
    inlineWordDiffPlugin,
    inlineWordDiffTheme,
  ]
}

export { RemovedTextWidget }
