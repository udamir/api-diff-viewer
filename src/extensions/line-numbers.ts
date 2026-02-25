/**
 * Spacer-Aware Line Numbers
 *
 * Custom line numbers extension that hides numbers for spacer lines
 * and adjusts display numbering to account for alignment gaps.
 */

import { Extension } from '@codemirror/state'
import {
  EditorView,
  lineNumbers,
} from '@codemirror/view'
import type { LineMapping } from '../types'
import type { GutterChangeType } from './diff-gutters'
import { diffMarkerGutterTheme } from './diff-gutters'

/** Create line numbers extension with spacer awareness - pass mappings and side directly */
export function createSpacerAwareLineNumbers(
  mappings: LineMapping[],
  side: 'before' | 'after' | 'unified',
  wordDiffMode: 'word' | 'char' | 'none' = 'word',
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
    const isSpacer = side !== 'unified' && (
      (side === 'before' && m.beforeLine === null) ||
      (side === 'after' && m.afterLine === null)
    )

    // When wordDiffMode is 'none', treat modified as removed/added
    const effectiveType = (wordDiffMode === 'none' && m.type === 'modified')
      ? (side === 'before' ? 'removed' : 'added')
      : m.type

    // Determine the change type for this line
    let changeType: GutterChangeType = 'unchanged'
    if (effectiveType === 'added') {
      changeType = 'added'
    } else if (effectiveType === 'removed') {
      changeType = 'removed'
    } else if (effectiveType === 'modified') {
      changeType = 'modified'
    }

    if (isSpacer) {
      lineInfo.set(docLineNum, { displayNum: null, changeType })
    } else {
      displayCounter++
      lineInfo.set(docLineNum, { displayNum: displayCounter, changeType })
    }
  }

  const extensions: Extension[] = []

  // Use standard lineNumbers with formatNumber for proper virtualized rendering
  // Diff marker gutter will be added separately after fold gutter
  extensions.push(
    lineNumbers({
      formatNumber: (lineNo) => {
        const info = lineInfo.get(lineNo)
        if (info) {
          return info.displayNum !== null ? String(info.displayNum) : ''
        }
        return String(lineNo)
      },
    }),
    diffMarkerGutterTheme,
  )

  return extensions
}
