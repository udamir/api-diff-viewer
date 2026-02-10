/**
 * Diff Folding — Theme and keymap for code folding in diff views.
 *
 * The actual folding behavior is provided by CodeMirror's built-in
 * codeFolding() + foldGutter() configured in base-view.ts.
 * This module provides the visual theme and keyboard shortcuts.
 */

import { Extension, StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { foldEffect, unfoldEffect, foldedRanges, foldable } from '@codemirror/language'

/** Classification counts for a foldable range */
export interface ClassificationCounts {
  breaking: number
  nonBreaking: number
  annotation: number
  unclassified: number
}

/** Theme for fold styling */
export const diffFoldingTheme = EditorView.baseTheme({
  // Invisible spacer placeholder (opposite side of a one-sided fold)
  '.cm-diff-fold-spacer': {
    display: 'inline',
  },
  // Fold badge wrapper
  '.cm-diff-fold-wrapper': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    margin: '0 4px',
    cursor: 'pointer',
    verticalAlign: 'middle',
  },
  // Individual badge (shared)
  '.cm-diff-fold-badge': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '14px',
    height: '14px',
    padding: '0 3px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: '600',
    lineHeight: '1',
  },
  // Ellipsis badge
  '.cm-diff-fold-badge-ellipsis': {
    backgroundColor: 'var(--diff-fold-widget-bg, #f6f8fa)',
    border: '1px solid var(--diff-fold-widget-border, #d0d7de)',
    color: 'var(--diff-fold-widget-color, #57606a)',
    fontSize: '8px',
  },
  '.cm-diff-fold-badge-ellipsis:hover': {
    backgroundColor: 'var(--diff-fold-widget-hover-bg, #eaeef2)',
  },
  // Classification counter badges
  '.cm-diff-fold-badge-breaking': {
    backgroundColor: 'var(--diff-badge-breaking-bg, #ffebe9)',
    color: 'var(--diff-breaking-color, #cf222e)',
  },
  '.cm-diff-fold-badge-non-breaking': {
    backgroundColor: 'var(--diff-badge-non-breaking-bg, #dafbe1)',
    color: 'var(--diff-non-breaking-color, #1a7f37)',
  },
  '.cm-diff-fold-badge-annotation': {
    backgroundColor: 'var(--diff-badge-annotation-bg, #f0e6ff)',
    color: 'var(--diff-annotation-color, #8250df)',
  },
  '.cm-diff-fold-badge-unclassified': {
    backgroundColor: 'var(--diff-badge-unclassified-bg, #eaeef2)',
    color: 'var(--diff-unclassified-color, #656d76)',
  },
  // Dark mode
  '&dark .cm-diff-fold-badge-ellipsis': {
    backgroundColor: 'var(--diff-fold-widget-bg, #21262d)',
    borderColor: 'var(--diff-fold-widget-border, #30363d)',
    color: 'var(--diff-fold-widget-color, #8b949e)',
  },
  '&dark .cm-diff-fold-badge-ellipsis:hover': {
    backgroundColor: 'var(--diff-fold-widget-hover-bg, #30363d)',
  },
  '&dark .cm-diff-fold-badge-breaking': {
    backgroundColor: 'var(--diff-badge-breaking-bg, #490202)',
    color: 'var(--diff-breaking-color, #f85149)',
  },
  '&dark .cm-diff-fold-badge-non-breaking': {
    backgroundColor: 'var(--diff-badge-non-breaking-bg, #04260f)',
    color: 'var(--diff-non-breaking-color, #3fb950)',
  },
  '&dark .cm-diff-fold-badge-annotation': {
    backgroundColor: 'var(--diff-badge-annotation-bg, #2a1a4e)',
    color: 'var(--diff-annotation-color, #a371f7)',
  },
  '&dark .cm-diff-fold-badge-unclassified': {
    backgroundColor: 'var(--diff-badge-unclassified-bg, #21262d)',
    color: 'var(--diff-unclassified-color, #768390)',
  },
})

/** Keymap for fold operations */
export const diffFoldKeymap = [
  {
    key: 'Ctrl-Shift-[',
    mac: 'Cmd-Alt-[',
    run: (view: EditorView) => {
      // Fold at cursor using language service
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      const range = foldable(view.state, line.from, line.to)
      if (range) {
        view.dispatch({ effects: foldEffect.of(range) })
        return true
      }
      return false
    },
  },
  {
    key: 'Ctrl-Shift-]',
    mac: 'Cmd-Alt-]',
    run: (view: EditorView) => {
      // Unfold at cursor
      const folded = foldedRanges(view.state)
      const pos = view.state.selection.main.head
      let unfolded = false

      folded.between(0, view.state.doc.length, (from, to) => {
        if (pos >= from && pos <= to) {
          view.dispatch({
            effects: unfoldEffect.of({ from, to }),
          })
          unfolded = true
        }
      })

      return unfolded
    },
  },
  {
    key: 'Ctrl-Alt-[',
    mac: 'Cmd-Ctrl-[',
    run: (view: EditorView) => {
      // Fold all foldable lines using language service
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
        return true
      }
      return false
    },
  },
  {
    key: 'Ctrl-Alt-]',
    mac: 'Cmd-Ctrl-]',
    run: (view: EditorView) => {
      // Unfold all
      const folded = foldedRanges(view.state)
      const effects: StateEffect<{ from: number; to: number }>[] = []

      folded.between(0, view.state.doc.length, (from, to) => {
        effects.push(unfoldEffect.of({ from, to }))
      })

      if (effects.length > 0) {
        view.dispatch({ effects })
        return true
      }
      return false
    },
  },
]

/** Create the diff folding extension (theme only) */
export function diffFolding(): Extension {
  return [diffFoldingTheme]
}
