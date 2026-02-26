import { describe, expect, it } from "vitest";
import { computeWordDiff } from "../../src/extensions/word-diff";

describe("computeWordDiff", () => {
	it("detects added words", () => {
		const { afterRanges } = computeWordDiff("hello", "hello world");
		expect(afterRanges.length).toBeGreaterThan(0);
		expect(afterRanges.some((r) => r.type === "added")).toBe(true);
	});

	it("detects removed words", () => {
		const { beforeRanges } = computeWordDiff("hello world", "hello");
		expect(beforeRanges.length).toBeGreaterThan(0);
		expect(beforeRanges.some((r) => r.type === "removed")).toBe(true);
	});

	it("returns empty ranges for identical strings", () => {
		const { beforeRanges, afterRanges } = computeWordDiff("hello", "hello");
		expect(beforeRanges.length).toBe(0);
		expect(afterRanges.length).toBe(0);
	});

	it("returns empty ranges for two empty strings", () => {
		const { beforeRanges, afterRanges } = computeWordDiff("", "");
		expect(beforeRanges.length).toBe(0);
		expect(afterRanges.length).toBe(0);
	});

	it("handles complete replacement", () => {
		const { beforeRanges, afterRanges } = computeWordDiff("foo", "bar");
		expect(beforeRanges.length).toBeGreaterThan(0);
		expect(afterRanges.length).toBeGreaterThan(0);
	});

	it("char mode highlights individual characters", () => {
		const { beforeRanges, afterRanges } = computeWordDiff("abc", "axc", "char");
		// 'b' removed, 'x' added
		expect(beforeRanges.length).toBeGreaterThan(0);
		expect(afterRanges.length).toBeGreaterThan(0);
		// Character-level diffs should produce small ranges
		expect(afterRanges.some((r) => r.to - r.from === 1)).toBe(true);
	});

	it("word mode highlights complete words", () => {
		const { afterRanges } = computeWordDiff("foo bar", "foo baz");
		expect(afterRanges.length).toBeGreaterThan(0);
	});

	it("ranges have correct from/to offsets", () => {
		const { afterRanges } = computeWordDiff("hello", "hello world", "word");
		for (const range of afterRanges) {
			expect(range.from).toBeGreaterThanOrEqual(0);
			expect(range.to).toBeGreaterThan(range.from);
		}
	});

	it("ranges cover the right portions in char mode", () => {
		const { beforeRanges, afterRanges } = computeWordDiff("cat", "car", "char");
		// 't' → 'r'
		expect(beforeRanges.length).toBeGreaterThan(0);
		expect(afterRanges.length).toBeGreaterThan(0);
		// The changed character is at index 2
		const removedRange = beforeRanges.find((r) => r.from === 2);
		expect(removedRange).toBeDefined();
		const addedRange = afterRanges.find((r) => r.from === 2);
		expect(addedRange).toBeDefined();
	});

	it("defaults to word mode when mode not specified", () => {
		const withDefault = computeWordDiff("foo bar", "foo baz");
		const withExplicit = computeWordDiff("foo bar", "foo baz", "word");
		expect(withDefault.afterRanges.length).toBe(withExplicit.afterRanges.length);
	});

	it("handles adding to empty string", () => {
		const { beforeRanges, afterRanges } = computeWordDiff("", "hello");
		expect(beforeRanges.length).toBe(0);
		expect(afterRanges.length).toBeGreaterThan(0);
	});

	it("handles removing to empty string", () => {
		const { beforeRanges, afterRanges } = computeWordDiff("hello", "");
		expect(beforeRanges.length).toBeGreaterThan(0);
		expect(afterRanges.length).toBe(0);
	});
});
