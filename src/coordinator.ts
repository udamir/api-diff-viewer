/**
 * Fold utilities for CodeMirror editor views.
 */

import { EditorView } from '@codemirror/view'
import { foldEffect, unfoldEffect, foldedRanges, foldable } from '@codemirror/language'
import type { StateEffect } from '@codemirror/state'

/** Unfold all folded ranges in a single editor view */
export function unfoldAllInView(view: EditorView): void {
  const folded = foldedRanges(view.state)
  const effects: StateEffect<{ from: number; to: number }>[] = []
  folded.between(0, view.state.doc.length, (from: number, to: number) => {
    effects.push(unfoldEffect.of({ from, to }))
  })
  if (effects.length > 0) {
    view.dispatch({ effects })
  }
}

/** Fold all foldable ranges in a single editor view */
export function foldAllInView(view: EditorView): void {
  const effects: StateEffect<{ from: number; to: number }>[] = []
  for (let i = 1; i <= view.state.doc.lines; i++) {
    const line = view.state.doc.line(i)
    const range = foldable(view.state, line.from, line.to)
    if (range) {
      effects.push(foldEffect.of(range))
    }
  }
  if (effects.length > 0) {
    view.dispatch({ effects })
  }
}
