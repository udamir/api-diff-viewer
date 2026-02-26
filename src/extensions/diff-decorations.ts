import { type Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { DiffBlockData } from "../diff-builder/common";
import { diffStateField, getDiffState } from "../state/diff-state";
import type { DiffData } from "../types";

/** CSS class names for diff decorations */
const diffClasses = {
	line: {
		added: "cm-diff-added",
		removed: "cm-diff-removed",
		modified: "cm-diff-modified",
		unchanged: "cm-diff-unchanged",
	},
	text: {
		added: "cm-diff-added-text",
		removed: "cm-diff-removed-text",
	},
	breaking: "cm-diff-breaking-line",
	selected: "cm-diff-selected",
	spacer: "cm-diff-spacer",
};

/** Line decoration for different diff types */
const lineDecorations = {
	added: Decoration.line({ class: diffClasses.line.added }),
	removed: Decoration.line({ class: diffClasses.line.removed }),
	modified: Decoration.line({ class: diffClasses.line.modified }),
	breaking: Decoration.line({ class: diffClasses.breaking }),
	selected: Decoration.line({ class: diffClasses.selected }),
};

/** Build decorations from diff blocks for a specific side */
function buildDecorations(
	view: EditorView,
	blocks: DiffBlockData[],
	side: "before" | "after" | "unified",
	selectedBlock: string | null
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;

	// Helper to add line decoration
	const addLineDecoration = (lineNum: number, decoration: Decoration) => {
		if (lineNum > 0 && lineNum <= doc.lines) {
			const line = doc.line(lineNum);
			builder.add(line.from, line.from, decoration);
		}
	};

	// Process blocks recursively
	const processBlock = (block: DiffBlockData) => {
		if (!block.diff) {
			// No diff metadata, process children
			for (const child of block.children) {
				processBlock(child);
			}
			return;
		}

		const { type, action } = block.diff;

		// Decorations are always applied; filtering is handled by folding
		const lineNum = block.index;

		// Determine decoration based on action and side
		if (side === "unified") {
			// Unified mode shows both additions and removals
			if (action === "add") {
				addLineDecoration(lineNum, lineDecorations.added);
			} else if (action === "remove") {
				addLineDecoration(lineNum, lineDecorations.removed);
			} else if (action === "replace" || action === "rename") {
				addLineDecoration(lineNum, lineDecorations.modified);
			}
		} else if (side === "before") {
			// Before side shows removals and modifications
			if (action === "remove" || action === "replace" || action === "rename") {
				addLineDecoration(lineNum, lineDecorations.removed);
			}
		} else if (side === "after") {
			// After side shows additions and modifications
			if (action === "add") {
				addLineDecoration(lineNum, lineDecorations.added);
			} else if (action === "replace" || action === "rename") {
				addLineDecoration(lineNum, lineDecorations.modified);
			}
		}

		// Add breaking change indicator
		if (type === "breaking") {
			addLineDecoration(lineNum, lineDecorations.breaking);
		}

		// Add selected block indicator
		if (block.id && block.id === selectedBlock) {
			addLineDecoration(lineNum, lineDecorations.selected);
		}

		// Process children
		for (const child of block.children) {
			processBlock(child);
		}
	};

	// Process all top-level blocks
	for (const block of blocks) {
		processBlock(block);
	}

	return builder.finish();
}

/** View plugin that manages diff decorations */
const diffDecorationsPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			// Rebuild decorations if document changed or diff state changed
			if (update.docChanged || update.state.field(diffStateField) !== update.startState.field(diffStateField)) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		buildDecorations(view: EditorView): DecorationSet {
			const state = getDiffState(view.state);
			return buildDecorations(view, state.blocks, state.side, state.selectedBlock);
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

/** Create diff decorations extension */
export function diffDecorations(_data: DiffData, _config: { side: "before" | "after" | "unified" }): Extension {
	return [diffStateField, diffDecorationsPlugin];
}

/** Theme styles for diff decorations */
export const diffDecorationsTheme = EditorView.baseTheme({
	".cm-diff-added": {
		backgroundColor: "var(--diff-added-bg, rgba(46, 160, 67, 0.15))",
	},
	".cm-diff-removed": {
		backgroundColor: "var(--diff-removed-bg, rgba(248, 81, 73, 0.15))",
	},
	".cm-diff-modified": {
		backgroundColor: "var(--diff-modified-bg, rgba(227, 179, 65, 0.15))",
	},
	".cm-diff-added-text": {
		backgroundColor: "var(--diff-added-text-bg, rgba(46, 160, 67, 0.4))",
		borderRadius: "2px",
	},
	".cm-diff-removed-text": {
		backgroundColor: "var(--diff-removed-text-bg, rgba(248, 81, 73, 0.4))",
		borderRadius: "2px",
		textDecoration: "line-through",
	},
	".cm-diff-breaking-line": {
		borderLeft: "3px solid var(--diff-breaking-color, #f85149)",
	},
	".cm-diff-selected": {
		backgroundColor: "var(--diff-selected-bg, rgba(56, 139, 253, 0.15))",
		outline: "1px solid var(--diff-selected-border, rgba(56, 139, 253, 0.4))",
	},
	".cm-diff-spacer": {
		backgroundColor: "var(--diff-spacer-bg, #f6f8fa)",
		backgroundImage:
			"repeating-linear-gradient(45deg, var(--diff-spacer-stripe, #e1e4e8) 0, var(--diff-spacer-stripe, #e1e4e8) 1px, transparent 0, transparent 50%)",
		backgroundSize: "8px 8px",
	},
});

export { diffDecorationsPlugin, buildDecorations };
