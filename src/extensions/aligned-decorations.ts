/**
 * Aligned Diff Decorations
 *
 * This extension applies line decorations based on a lineMap from
 * the visual alignment system.
 */

import { type Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { LineMapping } from "../types";

/** Line height in pixels - must be consistent across all elements */
export const LINE_HEIGHT_PX = 20;

/** Line decorations for different change types */
const addedLineDecoration = Decoration.line({ class: "cm-diff-line-added" });
const removedLineDecoration = Decoration.line({ class: "cm-diff-line-removed" });
const modifiedLineDecoration = Decoration.line({ class: "cm-diff-line-modified" });
const spacerLineDecoration = Decoration.line({ class: "cm-diff-line-spacer" });

/** Effect to set line mappings */
export const setLineMappingsEffect = StateEffect.define<LineMapping[]>();

/** Effect to set which side this editor represents */
export const setEditorSideEffect = StateEffect.define<"before" | "after" | "unified">();

/** Effect to set word diff mode (affects how modified lines are displayed) */
export const setWordDiffModeEffect = StateEffect.define<"word" | "char" | "none">();

/** State field to track line mappings */
export const lineMappingsField = StateField.define<{
	mappings: LineMapping[];
	side: "before" | "after" | "unified";
	wordDiffMode: "word" | "char" | "none";
}>({
	create() {
		return { mappings: [], side: "after", wordDiffMode: "word" };
	},
	update(state, tr) {
		let newState = state;
		for (const effect of tr.effects) {
			if (effect.is(setLineMappingsEffect)) {
				newState = { ...newState, mappings: effect.value };
			}
			if (effect.is(setEditorSideEffect)) {
				newState = { ...newState, side: effect.value };
			}
			if (effect.is(setWordDiffModeEffect)) {
				newState = { ...newState, wordDiffMode: effect.value };
			}
		}
		return newState;
	},
});

/** Check if a line is a spacer based on mappings and side */
function isSpacerLine(lineNum: number, mappings: LineMapping[], side: "before" | "after" | "unified"): boolean {
	const mapping = mappings[lineNum - 1];
	if (!mapping) return false;

	// Unified view has no spacers - all lines are shown
	if (side === "unified") return false;

	return (side === "before" && mapping.type === "added") || (side === "after" && mapping.type === "removed");
}

/** Build decorations based on line mappings */
function buildAlignedDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	const state = view.state.field(lineMappingsField, false);

	if (!state || state.mappings.length === 0) {
		return builder.finish();
	}

	const { mappings, side, wordDiffMode } = state;

	// Apply decorations to each line based on the mapping
	const numLines = Math.min(mappings.length, doc.lines);

	for (let i = 0; i < numLines; i++) {
		const mapping = mappings[i];
		const lineNum = i + 1;
		const line = doc.line(lineNum);
		let decoration: Decoration | null = null;

		// When wordDiffMode is 'none', treat modified lines as removed/added
		const effectiveType =
			wordDiffMode === "none" && mapping.type === "modified" ? (side === "before" ? "removed" : "added") : mapping.type;

		if (side === "before") {
			// Before side decorations
			if (effectiveType === "added") {
				// Added lines don't exist in before - show spacer
				decoration = spacerLineDecoration;
			} else if (effectiveType === "removed") {
				// Removed lines - highlight in red
				decoration = removedLineDecoration;
			} else if (effectiveType === "modified") {
				// Modified lines - highlight in yellow
				decoration = modifiedLineDecoration;
			}
			// Unchanged lines get no decoration
		} else if (side === "unified") {
			// Unified view - show both additions and removals directly
			if (effectiveType === "removed") {
				// Removed lines - highlight in red
				decoration = removedLineDecoration;
			} else if (effectiveType === "added") {
				// Added lines - highlight in green
				decoration = addedLineDecoration;
			} else if (effectiveType === "modified") {
				// Modified lines - highlight in yellow
				decoration = modifiedLineDecoration;
			}
			// Unchanged lines get no decoration
		} else {
			// After side decorations
			if (effectiveType === "removed") {
				// Removed lines don't exist in after - show spacer
				decoration = spacerLineDecoration;
			} else if (effectiveType === "added") {
				// Added lines - highlight in green
				decoration = addedLineDecoration;
			} else if (effectiveType === "modified") {
				// Modified lines - highlight in yellow
				decoration = modifiedLineDecoration;
			}
			// Unchanged lines get no decoration
		}

		if (decoration) {
			builder.add(line.from, line.from, decoration);
		}
	}

	return builder.finish();
}

/** View plugin for aligned decorations */
const alignedDecorationsPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildAlignedDecorations(view);
		}

		update(update: ViewUpdate) {
			// Only rebuild when the line mapping data or document content changes.
			// Line decorations are positionally stable — scrolling doesn't alter them.
			const mappingsChanged = update.transactions.some((tr) =>
				tr.effects.some((e) => e.is(setLineMappingsEffect) || e.is(setEditorSideEffect) || e.is(setWordDiffModeEffect))
			);
			if (update.docChanged || mappingsChanged) {
				this.decorations = buildAlignedDecorations(update.view);
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

/** Theme for aligned line decorations */
export const alignedDecorationsTheme = EditorView.baseTheme({
	// Set explicit line height in pixels for consistency
	".cm-content": {
		lineHeight: `${LINE_HEIGHT_PX}px`,
	},
	".cm-line": {
		minHeight: `${LINE_HEIGHT_PX}px`,
		lineHeight: `${LINE_HEIGHT_PX}px`,
		padding: "0 4px 0 0",
		margin: "0",
	},
	".cm-diff-line-added": {
		backgroundColor: "var(--diff-added-bg, rgba(46, 160, 67, 0.15))",
	},
	".cm-diff-line-removed": {
		backgroundColor: "var(--diff-removed-bg, rgba(248, 81, 73, 0.15))",
	},
	".cm-diff-line-modified": {
		backgroundColor: "var(--diff-modified-bg, rgba(227, 179, 65, 0.15))",
	},
	".cm-diff-line-spacer": {
		backgroundColor: "var(--diff-spacer-bg, #f6f8fa)",
		backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #e1e4e8) 0,
      var(--diff-spacer-stripe, #e1e4e8) 1px,
      transparent 1px,
      transparent 6px
    )`,
		color: "transparent !important",
		userSelect: "none",
		margin: "0",
		padding: "0",
		border: "none",
	},
	// Hide all text and visual elements inside spacer lines
	".cm-diff-line-spacer *": {
		color: "transparent !important",
		backgroundColor: "transparent !important",
		borderColor: "transparent !important",
	},
	".cm-diff-line-spacer .cm-lineWrapping": {
		color: "transparent !important",
	},
	// Dark mode
	"&dark .cm-diff-line-added": {
		backgroundColor: "var(--diff-added-bg, rgba(46, 160, 67, 0.2))",
	},
	"&dark .cm-diff-line-removed": {
		backgroundColor: "var(--diff-removed-bg, rgba(248, 81, 73, 0.2))",
	},
	"&dark .cm-diff-line-spacer": {
		backgroundColor: "var(--diff-spacer-bg, #161b22)",
		backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #30363d) 0,
      var(--diff-spacer-stripe, #30363d) 1px,
      transparent 1px,
      transparent 6px
    )`,
	},
});

/** Create aligned decorations extension */
export function alignedDecorations(): Extension {
	return [lineMappingsField, alignedDecorationsPlugin, alignedDecorationsTheme];
}

export { buildAlignedDecorations, alignedDecorationsPlugin, isSpacerLine };
