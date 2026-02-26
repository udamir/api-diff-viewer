/**
 * Fold State Persistence
 *
 * Utilities for extracting and restoring fold state across document updates.
 * Uses blockId as stable identifier to map folds between old and new line structures.
 */

import { foldable, foldEffect, foldedRanges } from "@codemirror/language";
import type { StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { LineMapping } from "../types";

/**
 * Extract the set of folded blockIds from a CodeMirror editor.
 * Returns a Set of blockIds that are currently folded.
 */
export function extractFoldedBlockIds(view: EditorView, lineMap: LineMapping[]): Set<string> {
	const foldedBlockIds = new Set<string>();
	const folded = foldedRanges(view.state);

	folded.between(0, view.state.doc.length, (from, _to) => {
		const lineNum = view.state.doc.lineAt(from).number;
		const mapping = lineMap[lineNum - 1];
		if (mapping?.blockId) {
			foldedBlockIds.add(mapping.blockId);
		}
	});

	return foldedBlockIds;
}

/**
 * Restore folds from a set of folded blockIds using a new lineMap.
 * Looks up each blockId in blockLineRanges to find the new line positions.
 */
export function restoreFoldsFromBlockIds(
	view: EditorView,
	foldedBlockIds: Set<string>,
	blockLineRanges: Map<string, { start: number; end: number }>
): void {
	if (foldedBlockIds.size === 0) return;

	const effects: StateEffect<{ from: number; to: number }>[] = [];
	const doc = view.state.doc;

	for (const blockId of foldedBlockIds) {
		const range = blockLineRanges.get(blockId);
		if (!range) continue;

		// Validate line numbers are within document bounds
		if (range.start < 1 || range.start > doc.lines) continue;

		const line = doc.line(range.start);

		// Use foldable() to get the correct fold range (after opening bracket)
		const foldRange = foldable(view.state, line.from, line.to);
		if (foldRange) {
			effects.push(foldEffect.of(foldRange));
		}
	}

	if (effects.length > 0) {
		view.dispatch({ effects });
	}
}
