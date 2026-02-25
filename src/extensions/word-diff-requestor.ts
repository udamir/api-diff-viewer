/**
 * Word Diff Requestor ViewPlugin
 *
 * Monitors the viewport and lazily computes word diffs for newly-visible
 * modified lines, dispatching extendWordDiffDataEffect as results become
 * available. This avoids computing word diffs for the entire document
 * upfront, which is expensive for large specs.
 */

import { ViewPlugin, type ViewUpdate, type EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { lineMappingsField } from './aligned-decorations'
import {
  buildWordDiffData,
  extendWordDiffDataEffect,
  wordDiffDataField,
} from './word-diff'

/**
 * Create the word diff requestor extension.
 *
 * @param beforeLines - Before-side content lines
 * @param afterLines - After-side content lines
 * @param side - Which editor side
 * @param mode - Diff granularity
 */
export function wordDiffRequestor(
  beforeLines: string[],
  afterLines: string[],
  side: 'before' | 'after',
  mode: 'word' | 'char' = 'word'
): Extension {
  return ViewPlugin.fromClass(
    class {
      /** Set of line ranges already computed (as "from-to" strings) */
      private computed = new Set<string>()
      private pending = false

      constructor(_view: EditorView) {
        // Initial viewport is handled by the initial setWordDiffDataEffect
      }

      update(update: ViewUpdate) {
        if (!update.viewportChanged && !update.docChanged) return
        if (this.pending) return

        const { from, to } = update.view.viewport
        const doc = update.state.doc
        const fromLine = doc.lineAt(from).number
        const toLine = doc.lineAt(to).number

        // Check if this range was already computed
        const key = `${fromLine}-${toLine}`
        if (this.computed.has(key)) return

        // Check if we actually need word diff for this range
        const mappingsState = update.state.field(lineMappingsField, false)
        if (!mappingsState || mappingsState.mappings.length === 0) return

        const existingData = update.state.field(wordDiffDataField, false) || []
        const existingLines = new Set(existingData.map(d => d.lineNumber))

        // Check if there are uncovered modified lines in the viewport
        let hasUncovered = false
        for (let i = fromLine - 1; i < toLine && i < mappingsState.mappings.length; i++) {
          const m = mappingsState.mappings[i]
          if ((m.type === 'modified' || m.pairId) && !existingLines.has(i + 1)) {
            hasUncovered = true
            break
          }
        }
        if (!hasUncovered) {
          this.computed.add(key)
          return
        }

        this.pending = true
        this.computed.add(key)

        // Use requestIdleCallback or setTimeout to avoid blocking scroll
        const compute = () => {
          this.pending = false

          const newData = buildWordDiffData(
            mappingsState.mappings,
            beforeLines,
            afterLines,
            side,
            mode,
            fromLine,
            toLine
          )

          if (newData.length > 0) {
            update.view.dispatch({
              effects: extendWordDiffDataEffect.of(newData),
            })
          }
        }

        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(compute, { timeout: 100 })
        } else {
          setTimeout(compute, 16)
        }
      }
    }
  )
}
