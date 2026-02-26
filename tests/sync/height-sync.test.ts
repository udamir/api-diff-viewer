import { describe, expect, it } from "vitest";
import { type HeightPadding, mapToPaddings, paddingsEqual } from "../../src/sync/height-sync";

// ── paddingsEqual ──

describe("paddingsEqual", () => {
	it("returns true for two empty arrays", () => {
		expect(paddingsEqual([], [])).toBe(true);
	});

	it("returns true for identical arrays", () => {
		const a: HeightPadding[] = [
			{ pos: 10, height: 20 },
			{ pos: 30, height: 40 },
		];
		const b: HeightPadding[] = [
			{ pos: 10, height: 20 },
			{ pos: 30, height: 40 },
		];
		expect(paddingsEqual(a, b)).toBe(true);
	});

	it("returns false when arrays have different lengths", () => {
		const a: HeightPadding[] = [{ pos: 10, height: 20 }];
		const b: HeightPadding[] = [
			{ pos: 10, height: 20 },
			{ pos: 30, height: 40 },
		];
		expect(paddingsEqual(a, b)).toBe(false);
	});

	it("returns false when positions differ", () => {
		const a: HeightPadding[] = [{ pos: 10, height: 20 }];
		const b: HeightPadding[] = [{ pos: 11, height: 20 }];
		expect(paddingsEqual(a, b)).toBe(false);
	});

	it("returns true when height difference is within threshold (0.5)", () => {
		const a: HeightPadding[] = [{ pos: 10, height: 20 }];
		const b: HeightPadding[] = [{ pos: 10, height: 20.4 }];
		expect(paddingsEqual(a, b)).toBe(true);
	});

	it("returns true when height difference is exactly at threshold", () => {
		const a: HeightPadding[] = [{ pos: 10, height: 20 }];
		const b: HeightPadding[] = [{ pos: 10, height: 20.5 }];
		expect(paddingsEqual(a, b)).toBe(true);
	});

	it("returns false when height difference exceeds threshold", () => {
		const a: HeightPadding[] = [{ pos: 10, height: 20 }];
		const b: HeightPadding[] = [{ pos: 10, height: 20.6 }];
		expect(paddingsEqual(a, b)).toBe(false);
	});

	it("returns false when first array is empty and second is not", () => {
		expect(paddingsEqual([], [{ pos: 0, height: 5 }])).toBe(false);
	});

	it("handles multiple entries with mixed close heights", () => {
		const a: HeightPadding[] = [
			{ pos: 5, height: 10 },
			{ pos: 15, height: 25 },
			{ pos: 30, height: 50 },
		];
		const b: HeightPadding[] = [
			{ pos: 5, height: 10.3 },
			{ pos: 15, height: 25.5 },
			{ pos: 30, height: 50.1 },
		];
		expect(paddingsEqual(a, b)).toBe(true);
	});
});

// ── mapToPaddings ──

describe("mapToPaddings", () => {
	/** Create a mock document with `n` lines, each 10 chars wide */
	function mockDoc(n: number) {
		return {
			lines: n,
			line: (lineNum: number) => ({
				to: lineNum * 10, // deterministic position
			}),
		};
	}

	it("returns empty array for empty map", () => {
		const result = mapToPaddings(new Map(), mockDoc(10));
		expect(result).toEqual([]);
	});

	it("converts a single entry", () => {
		const map = new Map([[3, 15]]);
		const result = mapToPaddings(map, mockDoc(10));
		expect(result).toEqual([{ pos: 30, height: 15 }]);
	});

	it("sorts entries by line number", () => {
		const map = new Map([
			[5, 10],
			[2, 20],
			[8, 5],
		]);
		const result = mapToPaddings(map, mockDoc(10));
		expect(result).toEqual([
			{ pos: 20, height: 20 },
			{ pos: 50, height: 10 },
			{ pos: 80, height: 5 },
		]);
	});

	it("filters out line numbers below 1", () => {
		const map = new Map([
			[0, 10],
			[-1, 20],
			[1, 30],
		]);
		const result = mapToPaddings(map, mockDoc(5));
		expect(result).toEqual([{ pos: 10, height: 30 }]);
	});

	it("filters out line numbers above doc.lines", () => {
		const map = new Map([
			[3, 10],
			[11, 20],
			[100, 30],
		]);
		const result = mapToPaddings(map, mockDoc(10));
		expect(result).toEqual([{ pos: 30, height: 10 }]);
	});

	it("maps position to line.to", () => {
		const doc = {
			lines: 5,
			line: (n: number) => ({ to: n * 100 + 50 }),
		};
		const map = new Map([[2, 8]]);
		const result = mapToPaddings(map, doc);
		expect(result).toEqual([{ pos: 250, height: 8 }]);
	});

	it("keeps entries at boundary line numbers (1 and doc.lines)", () => {
		const map = new Map([
			[1, 5],
			[10, 15],
		]);
		const result = mapToPaddings(map, mockDoc(10));
		expect(result).toEqual([
			{ pos: 10, height: 5 },
			{ pos: 100, height: 15 },
		]);
	});
});
