/**
 * Fold Synchronization Extension
 *
 * Synchronizes folding state between two CodeMirror editors in side-by-side view.
 * When a region is folded/unfolded in one editor, the corresponding fold gutter
 * chevron in the other editor is clicked to achieve the same fold/unfold.
 */

import { Extension, StateEffect } from '@codemirror/state'
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { foldEffect, unfoldEffect, foldedRanges } from '@codemirror/language'
import type { LineMapping } from '../types'

/** Effect to signal that fold sync should be temporarily disabled */
export const disableFoldSyncEffect = StateEffect.define<boolean>()

/** Options for fold sync */
export interface FoldSyncOptions {
  /** The other editor view to sync with */
  otherView: () => EditorView | null
  /** Line mappings for position correspondence */
  lineMap: LineMapping[]
  /** Which side this editor represents */
  side: 'before' | 'after'
}

/**
 * Creates a fold sync extension that synchronizes folding with another editor.
 */
export function foldSync(options: FoldSyncOptions): Extension {
  let syncEnabled = true
  let lastFoldedRanges = new Set<string>()

  return ViewPlugin.fromClass(
    class {
      constructor(private view: EditorView) {
        // Initialize with current folded ranges
        lastFoldedRanges = this.getFoldedRangeKeys()
      }

      update(update: ViewUpdate) {
        // Check if sync should be disabled
        for (const tr of update.transactions) {
          for (const effect of tr.effects) {
            if (effect.is(disableFoldSyncEffect)) {
              syncEnabled = effect.value === false
              return
            }
          }
        }

        if (!syncEnabled) return

        const otherView = options.otherView()
        if (!otherView) return

        // Check for fold/unfold effects in this transaction
        const hasFoldEffect = update.transactions.some(tr =>
          tr.effects.some(e => e.is(foldEffect) || e.is(unfoldEffect))
        )

        if (!hasFoldEffect) return

        // Get current folded ranges
        const currentFoldedRanges = this.getFoldedRangeKeys()

        // Find newly folded ranges
        const newlyFolded: Array<{ from: number; to: number }> = []
        const newlyUnfolded: Array<{ from: number; to: number }> = []

        for (const key of currentFoldedRanges) {
          if (!lastFoldedRanges.has(key)) {
            const [from, to] = key.split(':').map(Number)
            newlyFolded.push({ from, to })
          }
        }

        for (const key of lastFoldedRanges) {
          if (!currentFoldedRanges.has(key)) {
            const [from, to] = key.split(':').map(Number)
            newlyUnfolded.push({ from, to })
          }
        }

        // Update last known state
        lastFoldedRanges = currentFoldedRanges

        // Apply corresponding folds/unfolds to other editor by clicking gutter
        if (newlyFolded.length > 0 || newlyUnfolded.length > 0) {
          this.syncToOtherEditor(otherView, newlyFolded, newlyUnfolded)
        }
      }

      private getFoldedRangeKeys(): Set<string> {
        const keys = new Set<string>()
        const folded = foldedRanges(this.view.state)
        folded.between(0, this.view.state.doc.length, (from, to) => {
          keys.add(`${from}:${to}`)
        })
        return keys
      }

      private syncToOtherEditor(
        otherView: EditorView,
        newlyFolded: Array<{ from: number; to: number }>,
        newlyUnfolded: Array<{ from: number; to: number }>
      ) {
        // For aligned content, positions should match directly
        // since both editors have the same number of lines
        for (const range of newlyFolded) {
          const lineNumber = this.view.state.doc.lineAt(range.from).number
          clickFoldGutter(otherView, lineNumber)
        }

        for (const range of newlyUnfolded) {
          const lineNumber = this.view.state.doc.lineAt(range.from).number
          clickFoldGutter(otherView, lineNumber)
        }
      }
    }
  )
}

/**
 * Clicks the fold gutter element for a specific line in the editor.
 * This triggers the same fold/unfold behavior as a user click.
 */
function clickFoldGutter(view: EditorView, lineNumber: number): void {
  if (lineNumber < 1 || lineNumber > view.state.doc.lines) return

  const line = view.state.doc.line(lineNumber)
  const linePos = line.from

  // Get the visual position of this line
  const lineBlock = view.lineBlockAt(linePos)
  if (!lineBlock) return

  // Find the fold gutter element for this line
  const gutters = Array.from(view.dom.querySelectorAll('.cm-foldGutter .cm-gutterElement'))

  for (const gutter of gutters) {
    const gutterEl = gutter as HTMLElement
    const rect = gutterEl.getBoundingClientRect()
    const viewRect = view.dom.getBoundingClientRect()

    // Check if this gutter element is at the right vertical position
    const gutterTop = rect.top - viewRect.top + view.scrollDOM.scrollTop
    const lineTop = lineBlock.top

    // Allow some tolerance for matching
    if (Math.abs(gutterTop - lineTop) < 5) {
      // Found the gutter element for this line - click it
      gutterEl.click()
      return
    }
  }
}

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
    if (!syncEnabled) return previousState

    const currentState = getFoldedRangeKeys(sourceView)

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

      // Click fold gutters on the target editor
      for (const range of newlyFolded) {
        const lineNumber = getLineNumberFromRange(sourceView, range)
        clickFoldGutter(targetView, lineNumber)
      }

      for (const range of newlyUnfolded) {
        const lineNumber = getLineNumberFromRange(sourceView, range)
        clickFoldGutter(targetView, lineNumber)
      }

      requestAnimationFrame(() => {
        syncEnabled = true
      })
    }

    return currentState
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
