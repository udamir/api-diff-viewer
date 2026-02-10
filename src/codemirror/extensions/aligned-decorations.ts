/**
 * Aligned Diff Decorations
 *
 * This extension applies line decorations based on a lineMap from
 * the visual alignment system. Also provides custom line numbers
 * that hide for spacer lines.
 */

import { Extension, RangeSetBuilder, StateField, StateEffect, RangeSet } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  GutterMarker,
  gutter,
  lineNumbers,
} from '@codemirror/view'
import type { LineMapping } from '../types'

/** Line height in pixels - must be consistent across all elements */
const LINE_HEIGHT_PX = 20


/** Line decorations for different change types */
const addedLineDecoration = Decoration.line({ class: 'cm-diff-line-added' })
const removedLineDecoration = Decoration.line({ class: 'cm-diff-line-removed' })
const modifiedLineDecoration = Decoration.line({ class: 'cm-diff-line-modified' })
const spacerLineDecoration = Decoration.line({ class: 'cm-diff-line-spacer' })

/** Effect to set line mappings */
export const setLineMappingsEffect = StateEffect.define<LineMapping[]>()

/** Effect to set which side this editor represents */
export const setEditorSideEffect = StateEffect.define<'before' | 'after' | 'unified'>()

/** State field to track line mappings */
export const lineMappingsField = StateField.define<{
  mappings: LineMapping[]
  side: 'before' | 'after' | 'unified'
}>({
  create() {
    return { mappings: [], side: 'after' }
  },
  update(state, tr) {
    let newState = state
    for (const effect of tr.effects) {
      if (effect.is(setLineMappingsEffect)) {
        newState = { ...newState, mappings: effect.value }
      }
      if (effect.is(setEditorSideEffect)) {
        newState = { ...newState, side: effect.value }
      }
    }
    return newState
  },
})

/** Check if a line is a spacer based on mappings and side */
function isSpacerLine(
  lineNum: number,
  mappings: LineMapping[],
  side: 'before' | 'after' | 'unified'
): boolean {
  const mapping = mappings[lineNum - 1]
  if (!mapping) return false

  // Unified view has no spacers - all lines are shown
  if (side === 'unified') return false

  return (
    (side === 'before' && mapping.type === 'added') ||
    (side === 'after' && mapping.type === 'removed')
  )
}

/** Build decorations based on line mappings */
function buildAlignedDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  const state = view.state.field(lineMappingsField, false)

  if (!state || state.mappings.length === 0) {
    return builder.finish()
  }

  const { mappings, side } = state

  // Apply decorations to each line based on the mapping
  const numLines = Math.min(mappings.length, doc.lines)

  for (let i = 0; i < numLines; i++) {
    const mapping = mappings[i]
    const lineNum = i + 1
    const line = doc.line(lineNum)
    let decoration: Decoration | null = null

    if (side === 'before') {
      // Before side decorations
      if (mapping.type === 'added') {
        // Added lines don't exist in before - show spacer
        decoration = spacerLineDecoration
      } else if (mapping.type === 'removed') {
        // Removed lines - highlight in red
        decoration = removedLineDecoration
      } else if (mapping.type === 'modified') {
        // Modified lines - highlight in yellow
        decoration = modifiedLineDecoration
      }
      // Unchanged lines get no decoration
    } else if (side === 'unified') {
      // Unified view - show both additions and removals directly
      if (mapping.type === 'removed') {
        // Removed lines - highlight in red
        decoration = removedLineDecoration
      } else if (mapping.type === 'added') {
        // Added lines - highlight in green
        decoration = addedLineDecoration
      } else if (mapping.type === 'modified') {
        // Modified lines - highlight in yellow
        decoration = modifiedLineDecoration
      }
      // Unchanged lines get no decoration
    } else {
      // After side decorations
      if (mapping.type === 'removed') {
        // Removed lines don't exist in after - show spacer
        decoration = spacerLineDecoration
      } else if (mapping.type === 'added') {
        // Added lines - highlight in green
        decoration = addedLineDecoration
      } else if (mapping.type === 'modified') {
        // Modified lines - highlight in yellow
        decoration = modifiedLineDecoration
      }
      // Unchanged lines get no decoration
    }

    if (decoration) {
      builder.add(line.from, line.from, decoration)
    }
  }

  return builder.finish()
}

/** View plugin for aligned decorations */
const alignedDecorationsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildAlignedDecorations(view)
    }

    update(update: ViewUpdate) {
      // Rebuild decorations on any state change that might affect them
      if (update.docChanged || update.viewportChanged || update.transactions.length > 0) {
        this.decorations = buildAlignedDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

/** Theme for aligned line decorations */
export const alignedDecorationsTheme = EditorView.baseTheme({
  // Set explicit line height in pixels for consistency
  '.cm-content': {
    lineHeight: `${LINE_HEIGHT_PX}px`,
  },
  '.cm-line': {
    minHeight: `${LINE_HEIGHT_PX}px`,
    lineHeight: `${LINE_HEIGHT_PX}px`,
    padding: '0 4px 0 0',
    margin: '0',
  },
  '.cm-diff-line-added': {
    backgroundColor: 'var(--diff-added-bg, rgba(46, 160, 67, 0.15))',
  },
  '.cm-diff-line-removed': {
    backgroundColor: 'var(--diff-removed-bg, rgba(248, 81, 73, 0.15))',
  },
  '.cm-diff-line-modified': {
    backgroundColor: 'var(--diff-modified-bg, rgba(227, 179, 65, 0.15))',
  },
  '.cm-diff-line-spacer': {
    backgroundColor: 'var(--diff-spacer-bg, #f6f8fa)',
    backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #e1e4e8) 0,
      var(--diff-spacer-stripe, #e1e4e8) 1px,
      transparent 1px,
      transparent 6px
    )`,
    color: 'transparent !important',
    userSelect: 'none',
    margin: '0',
    padding: '0',
    border: 'none',
  },
  // Hide all text elements inside spacer lines
  '.cm-diff-line-spacer *': {
    color: 'transparent !important',
  },
  '.cm-diff-line-spacer .cm-lineWrapping': {
    color: 'transparent !important',
  },
  // Dark mode
  '&dark .cm-diff-line-added': {
    backgroundColor: 'var(--diff-added-bg, rgba(46, 160, 67, 0.2))',
  },
  '&dark .cm-diff-line-removed': {
    backgroundColor: 'var(--diff-removed-bg, rgba(248, 81, 73, 0.2))',
  },
  '&dark .cm-diff-line-spacer': {
    backgroundColor: 'var(--diff-spacer-bg, #161b22)',
    backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #30363d) 0,
      var(--diff-spacer-stripe, #30363d) 1px,
      transparent 1px,
      transparent 6px
    )`,
  },
})

/** Change type for gutter markers */
type GutterChangeType = 'added' | 'removed' | 'modified' | 'unchanged' | 'spacer'

/** Gutter marker for diff operation indicators */
class DiffMarkerGutterMarker extends GutterMarker {
  constructor(readonly changeType: GutterChangeType) {
    super()
  }

  toDOM() {
    const span = document.createElement('span')
    span.className = `cm-diff-marker cm-diff-marker-${this.changeType}`
    if (this.changeType === 'added') {
      span.textContent = '+'
    } else if (this.changeType === 'removed') {
      span.textContent = '−'
    } else if (this.changeType === 'modified') {
      span.textContent = '~'
    }
    return span
  }

  eq(other: GutterMarker): boolean {
    return other instanceof DiffMarkerGutterMarker && other.changeType === this.changeType
  }
}

/** Pre-computed markers for each change type */
const markerCache: Record<GutterChangeType, DiffMarkerGutterMarker> = {
  added: new DiffMarkerGutterMarker('added'),
  removed: new DiffMarkerGutterMarker('removed'),
  modified: new DiffMarkerGutterMarker('modified'),
  unchanged: new DiffMarkerGutterMarker('unchanged'),
  spacer: new DiffMarkerGutterMarker('spacer'),
}

/** Build gutter markers RangeSet from mappings */
function buildDiffGutterMarkers(
  doc: { lines: number; line: (n: number) => { from: number } },
  mappings: LineMapping[],
  side: 'before' | 'after' | 'unified'
): RangeSet<GutterMarker> {
  const builder = new RangeSetBuilder<GutterMarker>()
  const numLines = Math.min(mappings.length, doc.lines)

  for (let i = 0; i < numLines; i++) {
    const m = mappings[i]
    const docLineNum = i + 1
    const line = doc.line(docLineNum)

    // Check if this is a spacer line on this side
    // Unified view has no spacers
    const sourceLineNum = side === 'unified'
      ? (m.afterLine ?? m.beforeLine)
      : (side === 'before' ? m.beforeLine : m.afterLine)
    const isSpacer = sourceLineNum === null

    // Determine the change type for this line
    let changeType: GutterChangeType = 'unchanged'
    if (isSpacer) {
      changeType = 'spacer'
    } else if (m.type === 'added') {
      changeType = 'added'
    } else if (m.type === 'removed') {
      changeType = 'removed'
    } else if (m.type === 'modified') {
      changeType = 'modified'
    }

    // Only add markers for non-unchanged lines
    if (changeType !== 'unchanged') {
      builder.add(line.from, line.from, markerCache[changeType])
    }
  }

  return builder.finish()
}

/** Create line numbers extension with spacer awareness - pass mappings and side directly */
export function createSpacerAwareLineNumbers(
  mappings: LineMapping[],
  side: 'before' | 'after' | 'unified'
): Extension {
  // Pre-calculate display numbers and change types for each document line
  const lineInfo = new Map<
    number,
    { displayNum: number | null; changeType: GutterChangeType }
  >()
  let displayCounter = 0

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i]
    const docLineNum = i + 1 // Document lines are 1-indexed

    // Check if this is a spacer line on this side
    // Unified view has no spacers - use afterLine for numbering
    const sourceLineNum = side === 'unified'
      ? (m.afterLine ?? m.beforeLine)  // Prefer after, fall back to before
      : (side === 'before' ? m.beforeLine : m.afterLine)
    const isSpacer = sourceLineNum === null

    // Determine the change type for this line
    let changeType: GutterChangeType = 'unchanged'
    if (isSpacer) {
      changeType = 'spacer'
    } else if (m.type === 'added') {
      changeType = 'added'
    } else if (m.type === 'removed') {
      changeType = 'removed'
    } else if (m.type === 'modified') {
      changeType = 'modified'
    }

    if (isSpacer) {
      lineInfo.set(docLineNum, { displayNum: null, changeType })
    } else {
      displayCounter++
      lineInfo.set(docLineNum, { displayNum: displayCounter, changeType })
    }
  }

  // Create a StateField to hold gutter markers - this works with virtualization
  const diffMarkerField = StateField.define<RangeSet<GutterMarker>>({
    create(state) {
      return buildDiffGutterMarkers(state.doc, mappings, side)
    },
    update(markers, tr) {
      // Markers are static based on initial mappings, just map through doc changes
      if (tr.docChanged) {
        return markers.map(tr.changes)
      }
      return markers
    },
  })

  // Create a gutter that uses the StateField for markers
  const diffMarkerGutter = gutter({
    class: 'cm-diff-marker-gutter',
    markers: (view) => view.state.field(diffMarkerField),
  })

  // Use standard lineNumbers with formatNumber for proper virtualized rendering
  return [
    diffMarkerField,
    diffMarkerGutter,
    lineNumbers({
      formatNumber: (lineNo) => {
        const info = lineInfo.get(lineNo)
        if (info) {
          return info.displayNum !== null ? String(info.displayNum) : ''
        }
        return String(lineNo)
      },
    }),
    diffGutterTheme,
  ]
}

/** Theme for diff gutter styling */
const diffGutterTheme = EditorView.baseTheme({
  // Marker gutter styling
  '.cm-diff-marker-gutter': {
    width: '16px',
    minWidth: '16px',
  },
  '.cm-diff-marker-gutter .cm-gutterElement': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
  },
  // Marker styling
  '.cm-diff-marker': {
    fontWeight: 'bold',
    fontSize: '12px',
    lineHeight: `${LINE_HEIGHT_PX}px`,
  },
  '.cm-diff-marker-added': {
    color: 'var(--diff-added-marker, #1a7f37)',
    backgroundColor: 'var(--diff-added-gutter-bg, rgba(46, 160, 67, 0.15))',
    width: '100%',
    textAlign: 'center',
  },
  '.cm-diff-marker-removed': {
    color: 'var(--diff-removed-marker, #cf222e)',
    backgroundColor: 'var(--diff-removed-gutter-bg, rgba(248, 81, 73, 0.15))',
    width: '100%',
    textAlign: 'center',
  },
  '.cm-diff-marker-modified': {
    color: 'var(--diff-modified-marker, #9a6700)',
    backgroundColor: 'var(--diff-modified-gutter-bg, rgba(227, 179, 65, 0.15))',
    width: '100%',
    textAlign: 'center',
  },
  '.cm-diff-marker-spacer': {
    backgroundColor: 'var(--diff-spacer-bg, #f6f8fa)',
    backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #e1e4e8) 0,
      var(--diff-spacer-stripe, #e1e4e8) 1px,
      transparent 1px,
      transparent 6px
    )`,
    width: '100%',
    height: '100%',
  },
  // Line number gutter styling for different states
  '.cm-lineNumbers .cm-gutterElement': {
    minWidth: '32px',
    padding: '0 4px 0 8px',
  },
  // Dark mode
  '&dark .cm-diff-marker-added': {
    color: 'var(--diff-added-marker, #3fb950)',
    backgroundColor: 'var(--diff-added-gutter-bg, rgba(46, 160, 67, 0.2))',
  },
  '&dark .cm-diff-marker-removed': {
    color: 'var(--diff-removed-marker, #f85149)',
    backgroundColor: 'var(--diff-removed-gutter-bg, rgba(248, 81, 73, 0.2))',
  },
  '&dark .cm-diff-marker-modified': {
    color: 'var(--diff-modified-marker, #d29922)',
    backgroundColor: 'var(--diff-modified-gutter-bg, rgba(227, 179, 65, 0.2))',
  },
  '&dark .cm-diff-marker-spacer': {
    backgroundColor: 'var(--diff-spacer-bg, #161b22)',
    backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #30363d) 0,
      var(--diff-spacer-stripe, #30363d) 1px,
      transparent 1px,
      transparent 6px
    )`,
  },
})

/** Create aligned decorations extension */
export function alignedDecorations(): Extension {
  return [lineMappingsField, alignedDecorationsPlugin, alignedDecorationsTheme]
}

export { buildAlignedDecorations, alignedDecorationsPlugin, isSpacerLine, LINE_HEIGHT_PX }
