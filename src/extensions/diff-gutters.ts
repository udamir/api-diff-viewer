/**
 * Diff Gutters
 *
 * Gutter markers for diff operation indicators (+/-/~) and
 * classification (breaking/non-breaking/annotation) color bars.
 */

import { foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language";
import { type EditorState, type Extension, type RangeSet, RangeSetBuilder, StateField } from "@codemirror/state";
import { EditorView, GutterMarker, gutter } from "@codemirror/view";
import type { DiffType } from "api-smart-diff";
import type { LineMapping } from "../types";
import { LINE_HEIGHT_PX } from "./aligned-decorations";

/** Change type for gutter markers */
export type GutterChangeType = "added" | "removed" | "modified" | "unchanged" | "spacer";

/** Gutter marker for diff operation indicators */
class DiffMarkerGutterMarker extends GutterMarker {
	constructor(readonly changeType: GutterChangeType) {
		super();
	}

	toDOM() {
		const span = document.createElement("span");
		span.className = `cm-diff-marker cm-diff-marker-${this.changeType}`;
		if (this.changeType === "added") {
			span.textContent = "+";
		} else if (this.changeType === "removed") {
			span.textContent = "−";
		} else if (this.changeType === "modified") {
			span.textContent = "~";
		}
		return span;
	}

	eq(other: GutterMarker): boolean {
		return other instanceof DiffMarkerGutterMarker && other.changeType === this.changeType;
	}
}

/** Pre-computed markers for each change type */
const markerCache: Record<GutterChangeType, DiffMarkerGutterMarker> = {
	added: new DiffMarkerGutterMarker("added"),
	removed: new DiffMarkerGutterMarker("removed"),
	modified: new DiffMarkerGutterMarker("modified"),
	unchanged: new DiffMarkerGutterMarker("unchanged"),
	spacer: new DiffMarkerGutterMarker("spacer"),
};

/** Diff type label map for tooltips */
const diffTypeLabels: Record<string, string> = {
	breaking: "Breaking",
	"non-breaking": "Non-breaking",
	annotation: "Annotation",
	unclassified: "Unclassified",
};

/** Gutter marker for diff type indicator (colored dot with tooltip) */
class DiffTypeGutterMarker extends GutterMarker {
	constructor(readonly diffType: DiffType) {
		super();
	}

	toDOM() {
		const span = document.createElement("span");
		span.className = `cm-diff-type-dot cm-diff-type-${this.diffType}`;
		span.title = diffTypeLabels[this.diffType] || this.diffType;
		return span;
	}

	eq(other: GutterMarker): boolean {
		return other instanceof DiffTypeGutterMarker && other.diffType === this.diffType;
	}
}

/** Pre-computed diff type markers */
const diffTypeMarkerCache: Record<string, DiffTypeGutterMarker> = {
	breaking: new DiffTypeGutterMarker("breaking"),
	"non-breaking": new DiffTypeGutterMarker("non-breaking"),
	annotation: new DiffTypeGutterMarker("annotation"),
	unclassified: new DiffTypeGutterMarker("unclassified"),
};

/** Spacer marker for diff type gutter — fills space with spacer background */
class DiffTypeSpacer extends GutterMarker {
	toDOM() {
		const span = document.createElement("span");
		span.className = "cm-diff-type-spacer";
		return span;
	}
	eq(other: GutterMarker): boolean {
		return other instanceof DiffTypeSpacer;
	}
}
const diffTypeSpacerMarker = new DiffTypeSpacer();

/** Build diff type gutter markers RangeSet from mappings */
function buildDiffTypeGutterMarkers(
	doc: { lines: number; line: (n: number) => { from: number } },
	mappings: LineMapping[],
	side: "before" | "after" | "unified"
): RangeSet<GutterMarker> {
	const builder = new RangeSetBuilder<GutterMarker>();
	const numLines = Math.min(mappings.length, doc.lines);

	for (let i = 0; i < numLines; i++) {
		const m = mappings[i];
		const docLineNum = i + 1;
		const line = doc.line(docLineNum);

		// Spacer lines always get spacer background, even if they carry diffType
		const isSpacer =
			side !== "unified" &&
			((side === "before" && m.beforeLine === null) || (side === "after" && m.afterLine === null));

		if (isSpacer) {
			builder.add(line.from, line.from, diffTypeSpacerMarker);
		} else if (m.diffType && m.type !== "unchanged") {
			const marker = diffTypeMarkerCache[m.diffType];
			if (marker) {
				builder.add(line.from, line.from, marker);
			}
		}
	}

	return builder.finish();
}

/** Build gutter markers RangeSet from mappings */
function buildDiffGutterMarkers(
	doc: { lines: number; line: (n: number) => { from: number } },
	mappings: LineMapping[],
	side: "before" | "after" | "unified",
	wordDiffMode: "word" | "char" | "none" = "word"
): RangeSet<GutterMarker> {
	const builder = new RangeSetBuilder<GutterMarker>();
	const numLines = Math.min(mappings.length, doc.lines);

	for (let i = 0; i < numLines; i++) {
		const m = mappings[i];
		const docLineNum = i + 1;
		const line = doc.line(docLineNum);

		// Spacer lines get striped background, no +/- symbol
		const isSpacer =
			side !== "unified" &&
			((side === "before" && m.beforeLine === null) || (side === "after" && m.afterLine === null));
		if (isSpacer) {
			builder.add(line.from, line.from, markerCache.spacer);
			continue;
		}

		// When wordDiffMode is 'none', treat modified as removed/added
		const effectiveType =
			wordDiffMode === "none" && m.type === "modified" ? (side === "before" ? "removed" : "added") : m.type;

		// Determine the change type for this line
		let changeType: GutterChangeType = "unchanged";
		if (effectiveType === "added") {
			changeType = "added";
		} else if (effectiveType === "removed") {
			changeType = "removed";
		} else if (effectiveType === "modified") {
			changeType = "modified";
		}

		// Only add markers for non-unchanged lines
		if (changeType !== "unchanged") {
			builder.add(line.from, line.from, markerCache[changeType]);
		}
	}

	return builder.finish();
}

/** Priority map for diff types — lower is more severe */
const diffTypePriority: Record<string, number> = {
	breaking: 0,
	"non-breaking": 1,
	annotation: 2,
	unclassified: 3,
};

/** Get the most severe diff type from a BlockTreeIndex entry's counts */
function getMostSevereDiffTypeFromCounts(counts: {
	breaking: number;
	nonBreaking: number;
	annotation: number;
	unclassified: number;
}): string | null {
	if (counts.breaking > 0) return "breaking";
	if (counts.nonBreaking > 0) return "non-breaking";
	if (counts.annotation > 0) return "annotation";
	if (counts.unclassified > 0) return "unclassified";
	return null;
}

/** Build fold-aware diff type markers: overrides fold placeholder lines with the most severe classification */
function buildFoldAwareDiffTypeMarkers(
	state: EditorState,
	mappings: LineMapping[],
	side: "before" | "after" | "unified",
	treeIndex?: import("../utils/block-index").BlockTreeIndex | null
): RangeSet<GutterMarker> {
	// Build base markers (per-line)
	const baseMarkers = buildDiffTypeGutterMarkers(state.doc, mappings, side);

	// Find folded ranges and determine the most severe classification within each
	const folded = foldedRanges(state);
	const foldOverrides = new Map<number, GutterMarker>(); // line.from → marker

	folded.between(0, state.doc.length, (from, to) => {
		const foldLine = state.doc.lineAt(from);
		const toLine = state.doc.lineAt(to).number;

		// Skip folds that are entirely spacer lines on this side
		if (side !== "unified") {
			let hasRealContent = false;
			for (let lineNum = foldLine.number; lineNum <= toLine; lineNum++) {
				const i = lineNum - 1;
				if (i >= mappings.length) break;
				const m = mappings[i];
				if (side === "before" && m.beforeLine !== null) {
					hasRealContent = true;
					break;
				}
				if (side === "after" && m.afterLine !== null) {
					hasRealContent = true;
					break;
				}
			}
			if (!hasRealContent) return; // all-spacer fold — keep spacer marker
		}

		// Index-driven O(1) path: lookup block by fold start line
		if (treeIndex) {
			const foldBlockId = mappings[foldLine.number - 1]?.blockId;
			if (foldBlockId) {
				const entry = treeIndex.byId.get(foldBlockId);
				if (entry) {
					const bestType = getMostSevereDiffTypeFromCounts(entry.counts);
					if (bestType) {
						const marker = diffTypeMarkerCache[bestType];
						if (marker) foldOverrides.set(foldLine.from, marker);
					}
					return;
				}
			}
		}

		// Fallback: scan lines in fold range
		let bestPriority = Infinity;

		for (let lineNum = foldLine.number; lineNum <= toLine; lineNum++) {
			const i = lineNum - 1;
			if (i >= mappings.length) break;
			const m = mappings[i];
			if (m.diffType && m.type !== "unchanged") {
				const p = diffTypePriority[m.diffType] ?? 99;
				if (p < bestPriority) {
					bestPriority = p;
				}
			}
		}

		if (bestPriority < Infinity) {
			const bestType = Object.keys(diffTypePriority).find((k) => diffTypePriority[k] === bestPriority);
			if (bestType) {
				const marker = diffTypeMarkerCache[bestType];
				if (marker) {
					// Key by line.from (start of line) so the lookup in the rebuild loop matches
					foldOverrides.set(foldLine.from, marker);
				}
			}
		}
	});

	if (foldOverrides.size === 0) return baseMarkers;

	// Rebuild with overrides on fold placeholder lines
	const builder = new RangeSetBuilder<GutterMarker>();
	const numLines = Math.min(mappings.length, state.doc.lines);
	for (let i = 0; i < numLines; i++) {
		const m = mappings[i];
		const line = state.doc.line(i + 1);
		// Spacer lines always get spacer background, even inside folds
		const isSpacer =
			side !== "unified" &&
			((side === "before" && m.beforeLine === null) || (side === "after" && m.afterLine === null));
		const override = foldOverrides.get(line.from);
		if (isSpacer) {
			builder.add(line.from, line.from, diffTypeSpacerMarker);
		} else if (override) {
			builder.add(line.from, line.from, override);
		} else if (m.diffType && m.type !== "unchanged") {
			const marker = diffTypeMarkerCache[m.diffType];
			if (marker) builder.add(line.from, line.from, marker);
		}
	}
	return builder.finish();
}

/** Create classification gutter extensions (colored bar + fold-aware markers) */
export function createClassificationGutter(mappings: LineMapping[], side: "before" | "after" | "unified"): Extension[] {
	const diffTypeField = StateField.define<RangeSet<GutterMarker>>({
		create(state) {
			return buildFoldAwareDiffTypeMarkers(state, mappings, side);
		},
		update(markers, tr) {
			if (tr.docChanged) {
				return buildFoldAwareDiffTypeMarkers(tr.state, mappings, side);
			}
			// Rebuild when fold state changes
			const hasFoldChange = tr.effects.some((e) => e.is(foldEffect) || e.is(unfoldEffect));
			if (hasFoldChange) {
				return buildFoldAwareDiffTypeMarkers(tr.state, mappings, side);
			}
			return markers;
		},
	});

	const diffTypeGutter = gutter({
		class: "cm-diff-type-gutter",
		markers: (view) => view.state.field(diffTypeField),
	});

	return [diffTypeField, diffTypeGutter];
}

/** Create diff marker gutter extension - should be added after fold gutter */
export function createDiffMarkerGutter(
	mappings: LineMapping[],
	side: "before" | "after" | "unified",
	wordDiffMode: "word" | "char" | "none" = "word"
): Extension {
	// Create a StateField to hold change type gutter markers
	const diffMarkerField = StateField.define<RangeSet<GutterMarker>>({
		create(state) {
			return buildDiffGutterMarkers(state.doc, mappings, side, wordDiffMode);
		},
		update(markers, tr) {
			if (tr.docChanged) {
				return markers.map(tr.changes);
			}
			return markers;
		},
	});

	const diffMarkerGutter = gutter({
		class: "cm-diff-marker-gutter",
		markers: (view) => view.state.field(diffMarkerField),
	});

	return [diffMarkerField, diffMarkerGutter];
}

/** Theme for diff gutter styling */
export const diffMarkerGutterTheme = EditorView.baseTheme({
	// Marker gutter styling
	".cm-diff-marker-gutter": {
		width: "16px",
		minWidth: "16px",
	},
	".cm-diff-marker-gutter .cm-gutterElement": {
		display: "flex",
		alignItems: "stretch",
		justifyContent: "center",
		padding: "0",
	},
	// Marker styling — text sits on the first visual line,
	// background fills the full gutter height for wrapped lines
	".cm-diff-marker": {
		fontWeight: "bold",
		fontSize: "12px",
		lineHeight: `${LINE_HEIGHT_PX}px`,
		width: "100%",
		textAlign: "center",
	},
	".cm-diff-marker-added": {
		color: "var(--diff-added-marker, #1a7f37)",
		backgroundColor: "var(--diff-added-gutter-bg, rgba(46, 160, 67, 0.15))",
	},
	".cm-diff-marker-removed": {
		color: "var(--diff-removed-marker, #cf222e)",
		backgroundColor: "var(--diff-removed-gutter-bg, rgba(248, 81, 73, 0.15))",
	},
	".cm-diff-marker-modified": {
		color: "var(--diff-modified-marker, #9a6700)",
		backgroundColor: "var(--diff-modified-gutter-bg, rgba(227, 179, 65, 0.15))",
	},
	".cm-diff-marker-spacer": {
		backgroundColor: "var(--diff-spacer-bg, #f6f8fa)",
		backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #e1e4e8) 0,
      var(--diff-spacer-stripe, #e1e4e8) 1px,
      transparent 1px,
      transparent 6px
    )`,
	},
	// Line number gutter styling for different states
	".cm-lineNumbers .cm-gutterElement": {
		minWidth: "32px",
		padding: "0 4px 0 4px",
	},
	// Dark mode
	"&dark .cm-diff-marker-added": {
		color: "var(--diff-added-marker, #3fb950)",
		backgroundColor: "var(--diff-added-gutter-bg, rgba(46, 160, 67, 0.2))",
	},
	"&dark .cm-diff-marker-removed": {
		color: "var(--diff-removed-marker, #f85149)",
		backgroundColor: "var(--diff-removed-gutter-bg, rgba(248, 81, 73, 0.2))",
	},
	"&dark .cm-diff-marker-modified": {
		color: "var(--diff-modified-marker, #d29922)",
		backgroundColor: "var(--diff-modified-gutter-bg, rgba(227, 179, 65, 0.2))",
	},
	"&dark .cm-diff-marker-spacer": {
		backgroundColor: "var(--diff-spacer-bg, #161b22)",
		backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #30363d) 0,
      var(--diff-spacer-stripe, #30363d) 1px,
      transparent 1px,
      transparent 6px
    )`,
	},
	// Diff type indicator gutter
	".cm-diff-type-gutter": {
		width: "4px",
		minWidth: "4px",
	},
	".cm-diff-type-gutter .cm-gutterElement": {
		padding: "0 !important",
	},
	// Diff type indicator — full-height color bar, no rounding for seamless stacking
	".cm-diff-type-dot": {
		display: "block",
		width: "4px",
		height: "100%",
		cursor: "default",
	},
	".cm-diff-type-breaking": {
		backgroundColor: "var(--diff-breaking-color, #cf222e)",
	},
	".cm-diff-type-non-breaking": {
		backgroundColor: "var(--diff-non-breaking-color, #1a7f37)",
	},
	".cm-diff-type-annotation": {
		backgroundColor: "var(--diff-annotation-color, #8250df)",
	},
	".cm-diff-type-unclassified": {
		backgroundColor: "var(--diff-unclassified-color, #656d76)",
	},
	".cm-diff-type-spacer": {
		width: "4px",
		height: "100%",
		backgroundColor: "var(--diff-spacer-bg, #f6f8fa)",
	},
	// Dark mode diff type gutter
	"&dark .cm-diff-type-breaking": {
		backgroundColor: "var(--diff-breaking-color, #f85149)",
	},
	"&dark .cm-diff-type-non-breaking": {
		backgroundColor: "var(--diff-non-breaking-color, #3fb950)",
	},
	"&dark .cm-diff-type-annotation": {
		backgroundColor: "var(--diff-annotation-color, #a371f7)",
	},
	"&dark .cm-diff-type-unclassified": {
		backgroundColor: "var(--diff-unclassified-color, #768390)",
	},
	"&dark .cm-diff-type-spacer": {
		backgroundColor: "var(--diff-spacer-bg, #161b22)",
	},
});
