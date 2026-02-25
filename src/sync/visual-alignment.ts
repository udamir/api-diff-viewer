/**
 * Visual Alignment — barrel re-export.
 *
 * Re-exports everything from the three split modules so that existing
 * imports from './sync/visual-alignment' continue to work unchanged.
 */

// Types, constants, and shared helpers
export {
  SPACER_LINE,
  cachedIndent,
  tokensToStringBatch,
} from './alignment-types'

export type {
  AlignmentResult,
  UnifiedResult,
  UnifiedContentOptions,
} from './alignment-types'

// Side-by-side alignment
export {
  generateAlignedContentFromDiff,
  alignmentToContent,
} from './side-by-side-alignment'

// Unified/inline alignment
export {
  generateUnifiedContentFromDiff,
} from './unified-alignment'
