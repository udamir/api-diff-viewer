/**
 * Fold Placeholder — Classification-aware fold placeholder for CodeMirror
 *
 * Produces fold placeholders that show classification counter badges
 * (breaking, risky, non-breaking, deprecated, annotation, unclassified) and detects
 * spacer-only fold ranges.
 */

import type { EditorState } from "@codemirror/state";
import {
	type ClassificationCounts,
	diffTypeCountKeys,
	diffTypeLabels,
	diffTypes,
	emptyClassificationCounts,
	incrementCount,
} from "../diff-types";
import type { LineMapping } from "../types";

export interface FoldPlaceholderData {
	counts: ClassificationCounts;
	isSpacer: boolean;
}

/**
 * Compute classification counts for a specific folded range.
 * Called by CodeMirror's `preparePlaceholder` with the exact fold range.
 * Only counts lines that have real content on this editor's side
 * (skips spacer lines from the opposite side).
 */
export function prepareFoldPlaceholder(
	state: EditorState,
	range: { from: number; to: number },
	side: "before" | "after" | "unified",
	lineMap: LineMapping[]
): FoldPlaceholderData {
	const doc = state.doc;
	const fromLine = doc.lineAt(range.from).number;
	const toLine = doc.lineAt(range.to).number;
	const counts: ClassificationCounts = emptyClassificationCounts();

	// The fold widget appears on the header line (fromLine). If the header line
	// is a spacer, the placeholder must be invisible — the fold range may include
	// real content as children, but the placeholder sits on a spacer line where
	// nothing should be visible.
	if (side !== "unified") {
		const headerIdx = fromLine - 1;
		if (headerIdx < lineMap.length) {
			const headerMapping = lineMap[headerIdx];
			const headerIsSpacer =
				(side === "before" && headerMapping.beforeLine === null) ||
				(side === "after" && headerMapping.afterLine === null);
			if (headerIsSpacer) {
				return { counts, isSpacer: true };
			}
		}
	}

	// Scan lineMap entries that fall within this fold range.
	// Only count change roots — an added/removed block counts as one change,
	// its nested children do not add to the count.
	// Count ALL change roots regardless of spacer status so both sides show
	// identical counters for the same folded block.
	for (let lineNum = fromLine; lineNum <= toLine; lineNum++) {
		const i = lineNum - 1; // lineMap is 0-indexed
		if (i >= lineMap.length) break;
		const mapping = lineMap[i];
		if (!mapping.diffType) continue;
		if (!mapping.isChangeRoot) continue;

		incrementCount(counts, mapping.diffType);
	}

	return { counts, isSpacer: false };
}

/**
 * Create a fold placeholder DOM element with classification counter badges.
 * Receives pre-computed classification counts from `prepareFoldPlaceholder`.
 */
export function createFoldPlaceholder(prepared: FoldPlaceholderData, onclick?: (event: Event) => void): HTMLElement {
	const { counts, isSpacer } = prepared;

	// Spacer folds: render an invisible placeholder
	if (isSpacer) {
		const spacer = document.createElement("span");
		spacer.className = "cm-diff-fold-spacer";
		if (onclick) spacer.onclick = onclick;
		return spacer;
	}

	const wrapper = document.createElement("span");
	wrapper.className = "cm-diff-fold-wrapper";
	wrapper.title = "Click to expand";
	if (onclick) {
		wrapper.onclick = onclick;
	}

	// Ellipsis badge — always shown
	const ellipsis = document.createElement("span");
	ellipsis.className = "cm-diff-fold-badge cm-diff-fold-badge-ellipsis";
	ellipsis.textContent = "\u2026";
	wrapper.appendChild(ellipsis);

	// Classification counter badges
	for (const type of diffTypes) {
		const count = counts[diffTypeCountKeys[type]];
		if (count <= 0) continue;
		const badge = document.createElement("span");
		badge.className = `cm-diff-fold-badge cm-diff-fold-badge-${type}`;
		badge.textContent = String(count);
		badge.title = `${count} ${diffTypeLabels[type].toLowerCase()}`;
		wrapper.appendChild(badge);
	}

	return wrapper;
}
