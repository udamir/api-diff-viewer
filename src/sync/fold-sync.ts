/**
 * Fold Synchronization
 *
 * Synchronizes folding state between two CodeMirror editors in side-by-side view.
 * When a region is folded/unfolded in one editor, the corresponding region
 * in the other editor is folded/unfolded via the language service.
 */

import { StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { foldEffect, unfoldEffect, foldedRanges, foldable } from '@codemirror/language'
import type { LineMapping } from '../types'

/**
 * Sets up bidirectional fold sync between two editors.
 * Returns a cleanup function.
 */
export function setupFoldSync(
  beforeView: EditorView,
  afterView: EditorView,
  lineMap: LineMapping[]
): () => void {
  let syncEnabled = true
  let beforeFoldState = getFoldedRangeKeys(beforeView)
  let afterFoldState = getFoldedRangeKeys(afterView)

  function getFoldedRangeKeys(view: EditorView): Set<string> {
    const keys = new Set<string>()
    const folded = foldedRanges(view.state)
    folded.between(0, view.state.doc.length, (from, to) => {
      keys.add(`${from}:${to}`)
    })
    return keys
  }

  function getLineNumberFromRange(view: EditorView, range: { from: number }): number {
    return view.state.doc.lineAt(range.from).number
  }

  function syncFolds(
    sourceView: EditorView,
    targetView: EditorView,
    previousState: Set<string>
  ): Set<string> {
    const currentState = getFoldedRangeKeys(sourceView)

    // Always update state even when sync is disabled to prevent stale tracking
    if (!syncEnabled) return currentState

    const newlyFolded: Array<{ from: number; to: number }> = []
    const newlyUnfolded: Array<{ from: number; to: number }> = []

    for (const key of currentState) {
      if (!previousState.has(key)) {
        const [from, to] = key.split(':').map(Number)
        newlyFolded.push({ from, to })
      }
    }

    for (const key of previousState) {
      if (!currentState.has(key)) {
        const [from, to] = key.split(':').map(Number)
        newlyUnfolded.push({ from, to })
      }
    }

    if (newlyFolded.length > 0 || newlyUnfolded.length > 0) {
      syncEnabled = false

      const effects: StateEffect<{ from: number; to: number }>[] = []

      for (const range of newlyFolded) {
        const lineNumber = getLineNumberFromRange(sourceView, range)
        const targetRange = getTargetFoldRange(targetView, lineNumber)
        if (targetRange) {
          effects.push(foldEffect.of(targetRange))
        }
      }

      for (const range of newlyUnfolded) {
        const lineNumber = getLineNumberFromRange(sourceView, range)
        const targetRange = getTargetUnfoldRange(targetView, lineNumber)
        if (targetRange) {
          effects.push(unfoldEffect.of(targetRange))
        }
      }

      if (effects.length > 0) {
        targetView.dispatch({ effects })
      }

      requestAnimationFrame(() => {
        syncEnabled = true
      })
    }

    return currentState
  }

  /**
   * Get the fold range for a line on the target editor using the language service.
   * This returns the correct range (starting after the opening bracket/brace),
   * preserving the block header line.
   */
  function getTargetFoldRange(
    targetView: EditorView,
    lineNumber: number,
  ): { from: number; to: number } | null {
    const targetDoc = targetView.state.doc
    if (lineNumber < 1 || lineNumber > targetDoc.lines) return null

    const targetLine = targetDoc.line(lineNumber)
    return foldable(targetView.state, targetLine.from, targetLine.to)
  }

  /**
   * Find the actual folded range on the target editor at the given line number.
   * For unfolding we must match the exact range that was folded.
   */
  function getTargetUnfoldRange(
    targetView: EditorView,
    lineNumber: number,
  ): { from: number; to: number } | null {
    const targetDoc = targetView.state.doc
    if (lineNumber < 1 || lineNumber > targetDoc.lines) return null

    const targetLine = targetDoc.line(lineNumber)
    const folded = foldedRanges(targetView.state)

    let result: { from: number; to: number } | null = null
    folded.between(targetLine.from, targetLine.to, (from, to) => {
      result = { from, to }
    })

    return result
  }

  // Create update listeners
  const beforeListener = EditorView.updateListener.of((update) => {
    if (update.transactions.some(tr =>
      tr.effects.some(e => e.is(foldEffect) || e.is(unfoldEffect))
    )) {
      beforeFoldState = syncFolds(beforeView, afterView, beforeFoldState)
    }
  })

  const afterListener = EditorView.updateListener.of((update) => {
    if (update.transactions.some(tr =>
      tr.effects.some(e => e.is(foldEffect) || e.is(unfoldEffect))
    )) {
      afterFoldState = syncFolds(afterView, beforeView, afterFoldState)
    }
  })

  // Add listeners to views
  beforeView.dispatch({
    effects: StateEffect.appendConfig.of(beforeListener),
  })

  afterView.dispatch({
    effects: StateEffect.appendConfig.of(afterListener),
  })

  // Return cleanup function
  return () => {
    syncEnabled = false
  }
}
