import { json } from "@codemirror/lang-json";
import { codeFolding, foldable, foldedRanges, foldEffect } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vite-plus/test";
import { foldRangeEffects, normalizeFoldRanges } from "../../src/utils/fold-ranges";

const doc = JSON.stringify({ a: { b: { c: 1 }, d: [1, 2] }, e: { f: 2 } }, null, 2);

function createState(): EditorState {
	return EditorState.create({ doc, extensions: [json(), codeFolding()] });
}

/** Every foldable range of the document, in line order */
function allFoldable(state: EditorState): { from: number; to: number }[] {
	const ranges: { from: number; to: number }[] = [];
	for (let i = 1; i <= state.doc.lines; i++) {
		const line = state.doc.line(i);
		const range = foldable(state, line.from, line.to);
		if (range) ranges.push(range);
	}
	return ranges;
}

function folded(state: EditorState): string[] {
	const keys: string[] = [];
	foldedRanges(state).between(0, state.doc.length, (from, to) => {
		keys.push(`${from}:${to}`);
	});
	return keys.sort();
}

describe("normalizeFoldRanges", () => {
	it("sorts by from, outer range first when two ranges start together", () => {
		expect(
			normalizeFoldRanges(
				[
					{ from: 30, to: 40 },
					{ from: 10, to: 20 },
					{ from: 10, to: 50 },
				],
				100
			)
		).toEqual([
			{ from: 10, to: 50 },
			{ from: 10, to: 20 },
			{ from: 30, to: 40 },
		]);
	});

	it("removes duplicates", () => {
		expect(
			normalizeFoldRanges(
				[
					{ from: 10, to: 20 },
					{ from: 10, to: 20 },
				],
				100
			)
		).toEqual([{ from: 10, to: 20 }]);
	});

	it("keeps nested and adjacent ranges, drops a range crossing an earlier one", () => {
		expect(
			normalizeFoldRanges(
				[
					{ from: 0, to: 50 },
					{ from: 5, to: 10 },
					{ from: 40, to: 60 },
					{ from: 50, to: 70 },
				],
				100
			)
		).toEqual([
			{ from: 0, to: 50 },
			{ from: 5, to: 10 },
			{ from: 50, to: 70 },
		]);
	});

	it("drops empty, reversed, out-of-document and missing ranges", () => {
		expect(
			normalizeFoldRanges(
				[
					null,
					undefined,
					{ from: 5, to: 5 },
					{ from: 9, to: 3 },
					{ from: -1, to: 4 },
					{ from: 90, to: 101 },
					{ from: Number.NaN, to: 4 },
					{ from: 1, to: 2 },
				],
				100
			)
		).toEqual([{ from: 1, to: 2 }]);
	});
});

describe("foldRangeEffects", () => {
	it("applies ranges given in any order (e.g. the per-layer order of foldedRanges) in one transaction", () => {
		const state = createState();
		const ranges = allFoldable(state);
		expect(ranges.length).toBeGreaterThan(2);
		const shuffled = [...ranges].reverse();

		// the raw effects reproduce the CodeMirror error
		expect(() => state.update({ effects: shuffled.map((r) => foldEffect.of(r)) }).state).toThrow(/sorted/);

		const next = state.update({ effects: foldRangeEffects(state, [...shuffled, ...shuffled]) }).state;
		expect(folded(next)).toEqual(ranges.map((r) => `${r.from}:${r.to}`).sort());
	});
});
