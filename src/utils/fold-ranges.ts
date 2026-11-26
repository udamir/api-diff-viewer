/**
 * Fold range normalization
 *
 * CodeMirror adds all `foldEffect`s of one transaction to the fold state with a single `RangeSet.update`, which
 * requires the ranges sorted by `from`. Ranges collected from `foldedRanges(state).between(...)` are not in document
 * order when folds are nested (the set is iterated layer by layer), and ranges collected from block ids or from the
 * other editor can repeat or cross each other, so every place that dispatches several folds at once goes through here.
 */

import { foldEffect } from "@codemirror/language";
import type { EditorState, StateEffect } from "@codemirror/state";

export interface FoldRange {
	from: number;
	to: number;
}

/**
 * Returns the valid ranges sorted by `from` (the outer range first when two start together), without duplicates and
 * without ranges that cross an earlier kept range. Nested and adjacent ranges are kept. A range is valid when
 * `0 <= from < to <= docLength`.
 */
export function normalizeFoldRanges(ranges: Iterable<FoldRange | null | undefined>, docLength: number): FoldRange[] {
	const valid: FoldRange[] = [];
	for (const range of ranges) {
		if (!range) continue;
		const { from, to } = range;
		if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > docLength || from >= to) continue;
		valid.push({ from, to });
	}
	valid.sort((a, b) => a.from - b.from || b.to - a.to);

	const result: FoldRange[] = [];
	// the kept ranges that contain the current position, innermost last
	const open: FoldRange[] = [];
	for (const range of valid) {
		const last = result[result.length - 1];
		if (last && last.from === range.from && last.to === range.to) continue;
		while (open.length > 0 && open[open.length - 1].to <= range.from) open.pop();
		const parent = open[open.length - 1];
		if (parent && range.to > parent.to) continue;
		result.push(range);
		open.push(range);
	}
	return result;
}

/** `foldEffect`s for the given ranges, normalized for the document of `state` */
export function foldRangeEffects(
	state: EditorState,
	ranges: Iterable<FoldRange | null | undefined>
): StateEffect<FoldRange>[] {
	return normalizeFoldRanges(ranges, state.doc.length).map((range) => foldEffect.of(range));
}
