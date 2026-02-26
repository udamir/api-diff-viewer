/**
 * Spacer Line Decorations
 *
 * This extension adds visual styling to spacer lines in the diff view.
 * Spacer lines are placeholder lines inserted to align content between
 * before/after editors in side-by-side mode.
 */

import { type Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { SPACER_LINE } from "../sync/visual-alignment";

/** Line decoration for spacer lines */
const spacerLineDecoration = Decoration.line({
	class: "cm-diff-spacer-line",
	attributes: {
		"data-spacer": "true",
	},
});

/** Effect to set spacer line numbers */
export const setSpacerLinesEffect = StateEffect.define<Set<number>>();

/** State field to track spacer line numbers (0-indexed) */
export const spacerLinesField = StateField.define<Set<number>>({
	create() {
		return new Set();
	},
	update(spacers, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setSpacerLinesEffect)) {
				return effect.value;
			}
		}
		return spacers;
	},
});

/** Build decorations for spacer lines */
function buildSpacerDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	const spacerLines = view.state.field(spacerLinesField, false) ?? new Set();

	// Method 1: Use spacer lines set if available
	if (spacerLines.size > 0) {
		for (const lineIdx of Array.from(spacerLines).sort((a, b) => a - b)) {
			const lineNum = lineIdx + 1; // Convert to 1-based
			if (lineNum >= 1 && lineNum <= doc.lines) {
				const line = doc.line(lineNum);
				builder.add(line.from, line.from, spacerLineDecoration);
			}
		}
	} else {
		// Method 2: Detect spacer lines by content (zero-width space)
		for (let i = 1; i <= doc.lines; i++) {
			const line = doc.line(i);
			const text = doc.sliceString(line.from, line.to);
			if (text === SPACER_LINE || (text.trim() === "" && text.includes(SPACER_LINE))) {
				builder.add(line.from, line.from, spacerLineDecoration);
			}
		}
	}

	return builder.finish();
}

/** View plugin for spacer decorations */
const spacerDecorationsPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildSpacerDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildSpacerDecorations(update.view);
			}
			// Check for spacer lines effect
			for (const tr of update.transactions) {
				for (const effect of tr.effects) {
					if (effect.is(setSpacerLinesEffect)) {
						this.decorations = buildSpacerDecorations(update.view);
						break;
					}
				}
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

/** Theme for spacer lines */
export const spacerDecorationsTheme = EditorView.baseTheme({
	".cm-diff-spacer-line": {
		backgroundColor: "var(--diff-spacer-bg, #f6f8fa)",
		backgroundImage: `repeating-linear-gradient(
      -45deg,
      var(--diff-spacer-stripe, #e1e4e8) 0,
      var(--diff-spacer-stripe, #e1e4e8) 1px,
      transparent 1px,
      transparent 6px
    )`,
		position: "relative",
	},
	".cm-diff-spacer-line .cm-line": {
		color: "transparent",
		userSelect: "none",
	},
	// Hide content in spacer lines
	".cm-line:has([data-spacer])": {
		color: "transparent",
	},
	// Dark mode
	"&dark .cm-diff-spacer-line": {
		backgroundColor: "var(--diff-spacer-bg, #161b22)",
	},
	"&dark .cm-diff-spacer-line::before": {
		backgroundColor: "var(--diff-spacer-stripe, #30363d)",
	},
});

/** Create spacer decorations extension */
export function spacerDecorations(): Extension {
	return [spacerLinesField, spacerDecorationsPlugin, spacerDecorationsTheme];
}

export { buildSpacerDecorations, spacerDecorationsPlugin };
