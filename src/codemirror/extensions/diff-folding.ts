/**
 * Diff-Aware Code Folding Extension
 *
 * Provides smart folding for API structures with diff awareness:
 * - Fold/unfold objects and arrays
 * - Optionally auto-expand sections with changes
 * - Sync folding between before/after editors
 */

import { foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language";
import { type Extension, RangeSet, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { EditorView, GutterMarker, gutter, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import type { DiffBlockData } from "../../diff-builder/common";
import type { DiffData } from "../types";

/** Effect to set foldable ranges from diff data */
export const setFoldableRangesEffect = StateEffect.define<FoldableRange[]>();

/** Effect to toggle fold state of a block */
export const toggleFoldEffect = StateEffect.define<string>();

/** Effect to expand all folds */
export const expandAllEffect = StateEffect.define<void>();

/** Effect to collapse all folds */
export const collapseAllEffect = StateEffect.define<void>();

/** Effect to auto-expand blocks with changes */
export const autoExpandChangesEffect = StateEffect.define<void>();

/** A foldable range in the document */
export interface FoldableRange {
	blockId: string;
	from: number;
	to: number;
	hasChanges: boolean;
	changeCount: number;
	depth: number;
}

/** State field tracking foldable ranges */
export const foldableRangesField = StateField.define<FoldableRange[]>({
	create() {
		return [];
	},
	update(ranges, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setFoldableRangesEffect)) {
				return effect.value;
			}
		}
		// Map ranges through document changes
		if (tr.docChanged && ranges.length > 0) {
			return ranges.map((range) => ({
				...range,
				from: tr.changes.mapPos(range.from),
				to: tr.changes.mapPos(range.to),
			}));
		}
		return ranges;
	},
});

/** Widget shown when a region is folded */
class FoldWidget extends WidgetType {
	constructor(
		readonly lineCount: number,
		readonly hasChanges: boolean,
		readonly changeCount: number
	) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "cm-diff-fold-widget";
		if (this.hasChanges) {
			span.classList.add("cm-diff-fold-widget-changes");
		}

		let text = `⋯ ${this.lineCount} lines`;
		if (this.changeCount > 0) {
			text += ` (${this.changeCount} change${this.changeCount > 1 ? "s" : ""})`;
		}
		span.textContent = text;
		span.title = "Click to expand";

		return span;
	}

	eq(other: WidgetType): boolean {
		return (
			other instanceof FoldWidget &&
			other.lineCount === this.lineCount &&
			other.hasChanges === this.hasChanges &&
			other.changeCount === this.changeCount
		);
	}

	ignoreEvent(): boolean {
		return false;
	}
}

/** Gutter marker for fold controls */
class FoldGutterMarker extends GutterMarker {
	constructor(
		readonly isFolded: boolean,
		readonly blockId: string
	) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = `cm-diff-fold-marker ${this.isFolded ? "cm-diff-fold-marker-folded" : "cm-diff-fold-marker-open"}`;
		span.textContent = this.isFolded ? "▶" : "▼";
		span.title = this.isFolded ? "Expand" : "Collapse";
		span.dataset.blockId = this.blockId;
		return span;
	}

	eq(other: GutterMarker): boolean {
		return other instanceof FoldGutterMarker && other.isFolded === this.isFolded && other.blockId === this.blockId;
	}
}

/** Build fold gutter markers */
function buildFoldGutterMarkers(view: EditorView, foldableRanges: FoldableRange[]): RangeSet<GutterMarker> {
	const builder = new RangeSetBuilder<GutterMarker>();
	const doc = view.state.doc;
	const folded = foldedRanges(view.state);

	// Create a set of folded positions for quick lookup
	const foldedPositions = new Set<number>();
	folded.between(0, doc.length, (from) => {
		foldedPositions.add(from);
	});

	// Sort ranges by from position
	const sortedRanges = [...foldableRanges].sort((a, b) => a.from - b.from);

	for (const range of sortedRanges) {
		if (range.from >= 0 && range.from < doc.length) {
			const isFolded = foldedPositions.has(range.from);
			builder.add(range.from, range.from, new FoldGutterMarker(isFolded, range.blockId));
		}
	}

	return builder.finish();
}

/** View plugin for fold gutter */
const foldGutterPlugin = ViewPlugin.fromClass(
	class {
		markers: RangeSet<GutterMarker>;

		constructor(view: EditorView) {
			const ranges = view.state.field(foldableRangesField, false) || [];
			this.markers = buildFoldGutterMarkers(view, ranges);
		}

		update(update: ViewUpdate) {
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.transactions.some((tr) =>
					tr.effects.some((e) => e.is(setFoldableRangesEffect) || e.is(foldEffect) || e.is(unfoldEffect))
				)
			) {
				const ranges = update.state.field(foldableRangesField, false) || [];
				this.markers = buildFoldGutterMarkers(update.view, ranges);
			}
		}
	}
);

/** Fold gutter extension */
const diffFoldGutter = gutter({
	class: "cm-diff-fold-gutter",
	markers: (view) => view.plugin(foldGutterPlugin)?.markers || RangeSet.empty,
	domEventHandlers: {
		click: (view, _line, event) => {
			const target = event.target as HTMLElement;
			if (target.classList.contains("cm-diff-fold-marker")) {
				const blockId = target.dataset.blockId;
				if (blockId) {
					const ranges = view.state.field(foldableRangesField, false) || [];
					const range = ranges.find((r) => r.blockId === blockId);
					if (range) {
						toggleFoldAtRange(view, range);
						return true;
					}
				}
			}
			return false;
		},
	},
});

/** Toggle fold at a specific range */
function toggleFoldAtRange(view: EditorView, range: FoldableRange) {
	const folded = foldedRanges(view.state);
	let isFolded = false;

	folded.between(range.from, range.from + 1, () => {
		isFolded = true;
	});

	if (isFolded) {
		// Unfold
		view.dispatch({
			effects: unfoldEffect.of({ from: range.from, to: range.to }),
		});
	} else {
		// Fold
		view.dispatch({
			effects: foldEffect.of({ from: range.from, to: range.to }),
		});
	}
}

/** Build foldable ranges from diff data */
export function buildFoldableRanges(
	doc: { lineCount: number; line: (n: number) => { from: number; to: number } },
	diffData: DiffData,
	lineMap: Array<{ blockId?: string }>
): FoldableRange[] {
	const ranges: FoldableRange[] = [];

	// Group consecutive lines by block ID to find foldable regions
	const blockLines = new Map<string, { lines: number[]; hasChanges: boolean; changeCount: number }>();

	const countBlockChanges = (block: DiffBlockData): { hasChanges: boolean; count: number } => {
		let count = 0;
		let hasChanges = false;

		if (block.diff) {
			hasChanges = true;
			count++;
		}

		for (const child of block.children) {
			const childResult = countBlockChanges(child);
			if (childResult.hasChanges) hasChanges = true;
			count += childResult.count;
		}

		return { hasChanges, count };
	};

	// Build a map of block IDs to their change info
	const blockChangeInfo = new Map<string, { hasChanges: boolean; count: number }>();

	const processBlocks = (blocks: DiffBlockData[]) => {
		for (const block of blocks) {
			if (block.id) {
				blockChangeInfo.set(block.id, countBlockChanges(block));
			}
			processBlocks(block.children);
		}
	};

	processBlocks(diffData.blocks);

	// Group lines by their block ID
	for (let i = 0; i < lineMap.length; i++) {
		const mapping = lineMap[i];
		if (mapping.blockId) {
			const existing = blockLines.get(mapping.blockId);
			const info = blockChangeInfo.get(mapping.blockId) || { hasChanges: false, count: 0 };

			if (existing) {
				existing.lines.push(i + 1);
			} else {
				blockLines.set(mapping.blockId, {
					lines: [i + 1],
					hasChanges: info.hasChanges,
					changeCount: info.count,
				});
			}
		}
	}

	// Create foldable ranges for blocks with multiple lines
	for (const [blockId, info] of blockLines) {
		if (info.lines.length > 1) {
			const firstLine = Math.min(...info.lines);
			const lastLine = Math.max(...info.lines);

			if (firstLine < doc.lineCount && lastLine <= doc.lineCount) {
				const fromLine = doc.line(firstLine);
				const toLine = doc.line(lastLine);

				ranges.push({
					blockId,
					from: fromLine.from,
					to: toLine.to,
					hasChanges: info.hasChanges,
					changeCount: info.changeCount,
					depth: blockId.split(".").length,
				});
			}
		}
	}

	return ranges;
}

/** Theme for fold styling */
export const diffFoldingTheme = EditorView.baseTheme({
	".cm-diff-fold-gutter": {
		width: "14px",
		minWidth: "14px",
	},
	".cm-diff-fold-gutter .cm-gutterElement": {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "0",
		cursor: "pointer",
	},
	".cm-diff-fold-marker": {
		fontSize: "10px",
		color: "var(--diff-fold-marker, #6e7781)",
		transition: "transform 0.1s ease",
	},
	".cm-diff-fold-marker:hover": {
		color: "var(--diff-fold-marker-hover, #0969da)",
	},
	".cm-diff-fold-marker-folded": {
		transform: "rotate(0deg)",
	},
	".cm-diff-fold-marker-open": {
		transform: "rotate(0deg)",
	},
	".cm-diff-fold-widget": {
		display: "inline-block",
		padding: "0 4px",
		margin: "0 4px",
		backgroundColor: "var(--diff-fold-widget-bg, #f6f8fa)",
		border: "1px solid var(--diff-fold-widget-border, #d0d7de)",
		borderRadius: "3px",
		fontSize: "11px",
		color: "var(--diff-fold-widget-color, #57606a)",
		cursor: "pointer",
		verticalAlign: "middle",
	},
	".cm-diff-fold-widget:hover": {
		backgroundColor: "var(--diff-fold-widget-hover-bg, #eaeef2)",
	},
	".cm-diff-fold-widget-changes": {
		backgroundColor: "var(--diff-fold-widget-changes-bg, #fff8c5)",
		borderColor: "var(--diff-fold-widget-changes-border, #d4a72c)",
	},
	// Dark mode
	"&dark .cm-diff-fold-marker": {
		color: "var(--diff-fold-marker, #8b949e)",
	},
	"&dark .cm-diff-fold-marker:hover": {
		color: "var(--diff-fold-marker-hover, #58a6ff)",
	},
	"&dark .cm-diff-fold-widget": {
		backgroundColor: "var(--diff-fold-widget-bg, #21262d)",
		borderColor: "var(--diff-fold-widget-border, #30363d)",
		color: "var(--diff-fold-widget-color, #8b949e)",
	},
	"&dark .cm-diff-fold-widget:hover": {
		backgroundColor: "var(--diff-fold-widget-hover-bg, #30363d)",
	},
	"&dark .cm-diff-fold-widget-changes": {
		backgroundColor: "var(--diff-fold-widget-changes-bg, #3d2e00)",
		borderColor: "var(--diff-fold-widget-changes-border, #9e6a03)",
	},
});

/** Keymap for fold operations */
export const diffFoldKeymap = [
	{
		key: "Ctrl-Shift-[",
		mac: "Cmd-Alt-[",
		run: (view: EditorView) => {
			// Fold at cursor
			const ranges = view.state.field(foldableRangesField, false) || [];
			const pos = view.state.selection.main.head;

			for (const range of ranges) {
				if (pos >= range.from && pos <= range.to) {
					view.dispatch({
						effects: foldEffect.of({ from: range.from, to: range.to }),
					});
					return true;
				}
			}
			return false;
		},
	},
	{
		key: "Ctrl-Shift-]",
		mac: "Cmd-Alt-]",
		run: (view: EditorView) => {
			// Unfold at cursor
			const folded = foldedRanges(view.state);
			const pos = view.state.selection.main.head;
			let unfolded = false;

			folded.between(0, view.state.doc.length, (from, to) => {
				if (pos >= from && pos <= to) {
					view.dispatch({
						effects: unfoldEffect.of({ from, to }),
					});
					unfolded = true;
				}
			});

			return unfolded;
		},
	},
	{
		key: "Ctrl-Alt-[",
		mac: "Cmd-Ctrl-[",
		run: (view: EditorView) => {
			// Fold all
			const ranges = view.state.field(foldableRangesField, false) || [];
			const effects = ranges.map((r) => foldEffect.of({ from: r.from, to: r.to }));
			if (effects.length > 0) {
				view.dispatch({ effects });
				return true;
			}
			return false;
		},
	},
	{
		key: "Ctrl-Alt-]",
		mac: "Cmd-Ctrl-]",
		run: (view: EditorView) => {
			// Unfold all
			const folded = foldedRanges(view.state);
			const effects: StateEffect<{ from: number; to: number }>[] = [];

			folded.between(0, view.state.doc.length, (from, to) => {
				effects.push(unfoldEffect.of({ from, to }));
			});

			if (effects.length > 0) {
				view.dispatch({ effects });
				return true;
			}
			return false;
		},
	},
];

/** Create the diff folding extension */
export function diffFolding(): Extension {
	return [foldableRangesField, foldGutterPlugin, diffFoldGutter, diffFoldingTheme];
}

export { toggleFoldAtRange, FoldWidget, FoldGutterMarker };
