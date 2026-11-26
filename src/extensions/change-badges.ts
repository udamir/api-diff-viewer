/**
 * Change Badges Extension
 *
 * Displays inline badges showing change counts for API structure elements.
 * Badges appear next to keys/properties that have nested changes.
 */

import { type Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import type { DiffBlockData } from "../diff-builder/common";
import {
	addCounts,
	type ClassificationCounts,
	countsEqual,
	diffTypeCountKeys,
	diffTypeLabels,
	diffTypes,
	emptyClassificationCounts,
	incrementCount,
	totalCount,
} from "../diff-types";
import type { DiffData, LineMapping } from "../types";
import type { BlockTreeIndex } from "../utils/block-index";

/** Badge data for a specific line (per-type counters plus position) */
export interface BadgeData extends ClassificationCounts {
	lineNumber: number;
	position: number;
	total: number;
	blockId: string;
}

/** Effect to set badge data */
export const setBadgeDataEffect = StateEffect.define<BadgeData[]>();

/** State field for badge data */
export const badgeDataField = StateField.define<BadgeData[]>({
	create() {
		return [];
	},
	update(badges, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setBadgeDataEffect)) {
				return effect.value;
			}
		}
		// Map positions through document changes
		if (tr.docChanged && badges.length > 0) {
			return badges.map((badge) => ({
				...badge,
				position: tr.changes.mapPos(badge.position),
			}));
		}
		return badges;
	},
});

/** Widget for displaying change badges */
class ChangeBadgeWidget extends WidgetType {
	readonly counts: ClassificationCounts;

	constructor(
		counts: ClassificationCounts,
		readonly blockId: string
	) {
		super();
		// Copy only the counters, so extra fields (e.g. a whole BadgeData) are not retained
		this.counts = emptyClassificationCounts();
		addCounts(this.counts, counts);
	}

	get total(): number {
		return totalCount(this.counts);
	}

	toDOM(): HTMLElement {
		const container = document.createElement("span");
		container.className = "cm-change-badges";
		container.dataset.blockId = this.blockId;

		// One badge per classification, from the most to the least severe
		for (const type of diffTypes) {
			const count = this.counts[diffTypeCountKeys[type]];
			if (count > 0) {
				container.appendChild(this.createBadge(type, count, `${diffTypeLabels[type]} changes`));
			}
		}

		return container;
	}

	private createBadge(type: string, count: number, title: string): HTMLElement {
		const badge = document.createElement("span");
		badge.className = `cm-change-badge cm-change-badge-${type}`;
		badge.textContent = String(count);
		badge.title = `${count} ${title.toLowerCase()}`;
		badge.setAttribute("aria-label", badge.title);
		return badge;
	}

	eq(other: WidgetType): boolean {
		return (
			other instanceof ChangeBadgeWidget && other.blockId === this.blockId && countsEqual(other.counts, this.counts)
		);
	}

	ignoreEvent(): boolean {
		return true;
	}
}

/** Build decorations from badge data */
function buildBadgeDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const badges = view.state.field(badgeDataField, false) || [];
	const doc = view.state.doc;

	// Sort badges by position
	const sortedBadges = [...badges].sort((a, b) => a.position - b.position);

	for (const badge of sortedBadges) {
		if (badge.total > 0 && badge.position >= 0 && badge.position <= doc.length) {
			const widget = new ChangeBadgeWidget(badge, badge.blockId);

			const decoration = Decoration.widget({
				widget,
				side: 1, // After the position
			});

			builder.add(badge.position, badge.position, decoration);
		}
	}

	return builder.finish();
}

/** View plugin for change badges */
const changeBadgesPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildBadgeDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.transactions.some((tr) => tr.effects.some((e) => e.is(setBadgeDataEffect)))) {
				this.decorations = buildBadgeDecorations(update.view);
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

/** Count changes in a block and its children */
function countBlockChanges(block: DiffBlockData): ClassificationCounts {
	const counts = emptyClassificationCounts();

	// Count this block's change
	if (block.diff) {
		incrementCount(counts, block.diff.type);
	}

	// Count children's changes
	for (const child of block.children) {
		addCounts(counts, countBlockChanges(child));
	}

	return counts;
}

/**
 * Build badge data from diff data and line mappings.
 *
 * When a treeIndex and blockLineRanges are provided, uses the pre-computed
 * index for O(C) where C = number of containers. Otherwise falls back to
 * recursively walking the block tree.
 */
export function buildBadgeData(
	doc: { line: (n: number) => { from: number; to: number }; readonly lines: number },
	diffData: DiffData,
	lineMap: LineMapping[],
	_side: "before" | "after" | "unified",
	treeIndex?: BlockTreeIndex,
	blockLineRanges?: Map<string, { start: number; end: number }>
): BadgeData[] {
	// Index-driven fast path
	if (treeIndex && blockLineRanges) {
		const badges: BadgeData[] = [];

		for (const containerId of treeIndex.containerIds) {
			const entry = treeIndex.byId.get(containerId);
			if (!entry) continue;

			const { counts } = entry;
			const total = totalCount(counts);
			if (total <= 0) continue;

			const lineRange = blockLineRanges.get(containerId);
			if (!lineRange) continue;

			const lineNum = lineRange.start;
			if (lineNum < 1 || lineNum > doc.lines) continue;

			try {
				const line = doc.line(lineNum);
				badges.push({
					...counts,
					lineNumber: lineNum,
					position: line.to,
					total,
					blockId: containerId,
				});
			} catch {
				// Line doesn't exist
			}
		}

		return badges;
	}

	// Tree-walk fallback
	const badges: BadgeData[] = [];
	const processedBlocks = new Set<string>();

	// Build a map of block IDs to their first line
	const blockFirstLines = new Map<string, number>();
	for (let i = 0; i < lineMap.length; i++) {
		const mapping = lineMap[i];
		if (mapping.blockId && !blockFirstLines.has(mapping.blockId)) {
			blockFirstLines.set(mapping.blockId, i + 1);
		}
	}

	const processBlocks = (blocks: DiffBlockData[]) => {
		for (const block of blocks) {
			if (block.children.length > 0 && block.id && !processedBlocks.has(block.id)) {
				processedBlocks.add(block.id);

				const counts = countBlockChanges(block);
				const total = totalCount(counts);

				if (total > 0) {
					const lineNum = blockFirstLines.get(block.id);
					if (lineNum && lineNum <= doc.lines) {
						try {
							const line = doc.line(lineNum);
							badges.push({
								...counts,
								lineNumber: lineNum,
								position: line.to,
								total,
								blockId: block.id,
							});
						} catch {
							// Line doesn't exist in document
						}
					}
				}
			}

			processBlocks(block.children);
		}
	};

	processBlocks(diffData.blocks);

	return badges;
}

/** Theme for change badges */
export const changeBadgesTheme = EditorView.baseTheme({
	".cm-change-badges": {
		display: "inline-flex",
		gap: "2px",
		marginLeft: "8px",
		verticalAlign: "middle",
	},
	".cm-change-badge": {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		minWidth: "16px",
		height: "16px",
		padding: "0 4px",
		borderRadius: "8px",
		fontSize: "10px",
		fontWeight: "600",
		lineHeight: "1",
		cursor: "default",
	},
	".cm-change-badge-breaking": {
		backgroundColor: "var(--diff-badge-breaking-bg, #ffebe9)",
		color: "var(--diff-badge-breaking-color, #cf222e)",
		border: "1px solid var(--diff-badge-breaking-border, #ff8182)",
	},
	".cm-change-badge-risky": {
		backgroundColor: "var(--diff-badge-risky-bg, #fff1e5)",
		color: "var(--diff-badge-risky-color, #bc4c00)",
		border: "1px solid var(--diff-badge-risky-border, #fb8f44)",
	},
	".cm-change-badge-non-breaking": {
		backgroundColor: "var(--diff-badge-non-breaking-bg, #dafbe1)",
		color: "var(--diff-badge-non-breaking-color, #1a7f37)",
		border: "1px solid var(--diff-badge-non-breaking-border, #4ac26b)",
	},
	".cm-change-badge-deprecated": {
		backgroundColor: "var(--diff-badge-deprecated-bg, #fff8c5)",
		color: "var(--diff-badge-deprecated-color, #9a6700)",
		border: "1px solid var(--diff-badge-deprecated-border, #d4a72c)",
	},
	".cm-change-badge-annotation": {
		backgroundColor: "var(--diff-badge-annotation-bg, #ddf4ff)",
		color: "var(--diff-badge-annotation-color, #0969da)",
		border: "1px solid var(--diff-badge-annotation-border, #54aeff)",
	},
	".cm-change-badge-unclassified": {
		backgroundColor: "var(--diff-badge-unclassified-bg, #eaeef2)",
		color: "var(--diff-badge-unclassified-color, #57606a)",
		border: "1px solid var(--diff-badge-unclassified-border, #afb8c1)",
	},
	// Dark mode
	"&dark .cm-change-badge-breaking": {
		backgroundColor: "var(--diff-badge-breaking-bg, #490202)",
		color: "var(--diff-badge-breaking-color, #ff7b72)",
		borderColor: "var(--diff-badge-breaking-border, #f85149)",
	},
	"&dark .cm-change-badge-risky": {
		backgroundColor: "var(--diff-badge-risky-bg, #3d1d00)",
		color: "var(--diff-badge-risky-color, #f0883e)",
		borderColor: "var(--diff-badge-risky-border, #bd561d)",
	},
	"&dark .cm-change-badge-non-breaking": {
		backgroundColor: "var(--diff-badge-non-breaking-bg, #04260f)",
		color: "var(--diff-badge-non-breaking-color, #3fb950)",
		borderColor: "var(--diff-badge-non-breaking-border, #238636)",
	},
	"&dark .cm-change-badge-deprecated": {
		backgroundColor: "var(--diff-badge-deprecated-bg, #3b2300)",
		color: "var(--diff-badge-deprecated-color, #d29922)",
		borderColor: "var(--diff-badge-deprecated-border, #9e6a03)",
	},
	"&dark .cm-change-badge-annotation": {
		backgroundColor: "var(--diff-badge-annotation-bg, #0c2d6b)",
		color: "var(--diff-badge-annotation-color, #58a6ff)",
		borderColor: "var(--diff-badge-annotation-border, #1f6feb)",
	},
	"&dark .cm-change-badge-unclassified": {
		backgroundColor: "var(--diff-badge-unclassified-bg, #21262d)",
		color: "var(--diff-badge-unclassified-color, #8b949e)",
		borderColor: "var(--diff-badge-unclassified-border, #30363d)",
	},
});

/** Create the change badges extension */
export function changeBadges(): Extension {
	return [badgeDataField, changeBadgesPlugin, changeBadgesTheme];
}

export { ChangeBadgeWidget };
