/**
 * Visual Alignment — barrel re-export.
 *
 * Re-exports everything from the three split modules so that existing
 * imports from './sync/visual-alignment' continue to work unchanged.
 */

export type {
	AlignmentResult,
	UnifiedContentOptions,
	UnifiedResult,
} from "./alignment-types";
// Types, constants, and shared helpers
export {
	cachedIndent,
	SPACER_LINE,
	tokensToStringBatch,
} from "./alignment-types";

// Side-by-side alignment
export {
	alignmentToContent,
	generateAlignedContentFromDiff,
} from "./side-by-side-alignment";

// Unified/inline alignment
export { generateUnifiedContentFromDiff } from "./unified-alignment";
