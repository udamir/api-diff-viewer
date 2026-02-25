/**
 * Height Padding Widgets & State for Side-by-Side Diff View
 *
 * Provides the padding widget class, state field, effects, and
 * utility functions used by height-sync.ts to insert invisible
 * padding widgets that equalize line heights between two editors.
 */

import { StateEffect, StateField } from '@codemirror/state'
import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
} from '@codemirror/view'

// ── Constants ──

/** Height difference threshold in pixels; differences below this are ignored */
export const HEIGHT_THRESHOLD = 0.5

// ── Padding entry ──

/** Padding entry: document position and pixel height to add */
export interface HeightPadding {
  pos: number
  height: number
}

// ── Widget ──

/** Block widget that renders as invisible space with a given height */
class HeightPadWidget extends WidgetType {
  constructor(readonly padHeight: number) {
    super()
  }

  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.style.height = `${this.padHeight}px`
    div.className = 'cm-height-pad'
    return div
  }

  eq(other: HeightPadWidget): boolean {
    return Math.abs(this.padHeight - other.padHeight) < HEIGHT_THRESHOLD
  }

  get estimatedHeight(): number {
    return this.padHeight
  }
}

// ── State & Decorations ──

/** Effect to replace all height paddings */
export const setHeightPaddingEffect = StateEffect.define<HeightPadding[]>()

/** Build block widget DecorationSet from a paddings array */
function buildPadDecorations(
  paddings: HeightPadding[],
  docLen: number
): DecorationSet {
  if (paddings.length === 0) return Decoration.none

  const widgets = []

  for (const pad of paddings) {
    if (pad.pos < 0 || pad.pos > docLen || pad.height < HEIGHT_THRESHOLD) continue
    widgets.push(
      Decoration.widget({
        widget: new HeightPadWidget(pad.height),
        block: true,
        side: 1,
      }).range(pad.pos)
    )
  }

  if (widgets.length === 0) return Decoration.none
  return Decoration.set(widgets, true)
}

/**
 * State field that stores height paddings AND provides block decorations.
 *
 * Block-level decorations (block: true widgets) MUST be provided via a
 * StateField, not a ViewPlugin. CodeMirror throws "Block decorations may
 * not be specified via plugins" if you try the latter.
 */
export const heightPaddingField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHeightPaddingEffect)) {
        return buildPadDecorations(effect.value, tr.newDoc.length)
      }
    }
    if (tr.docChanged) {
      return decos.map(tr.changes)
    }
    return decos
  },
  provide: (field) => EditorView.decorations.from(field),
})

/** Theme for height padding widgets (invisible) */
export const heightPadTheme = EditorView.baseTheme({
  '.cm-height-pad': {
    overflow: 'hidden',
    pointerEvents: 'none',
  },
})

/** Compare two padding arrays for equality (within tolerance) */
export function paddingsEqual(a: HeightPadding[], b: HeightPadding[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].pos !== b[i].pos) return false
    if (Math.abs(a[i].height - b[i].height) > HEIGHT_THRESHOLD) return false
  }
  return true
}

/** Convert a padding map to a sorted HeightPadding array */
export function mapToPaddings(
  padMap: Map<number, number>,
  doc: { line: (n: number) => { to: number }; lines: number }
): HeightPadding[] {
  const entries = [...padMap.entries()]
    .filter(([lineNum]) => lineNum >= 1 && lineNum <= doc.lines)
    .sort((a, b) => a[0] - b[0])

  return entries.map(([lineNum, height]) => ({
    pos: doc.line(lineNum).to,
    height,
  }))
}
