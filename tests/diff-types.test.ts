import { ClassifierType, type DiffType } from "api-smart-diff";
import { describe, expect, it } from "vite-plus/test";
import {
	addCounts,
	countsEqual,
	countsFromArray,
	diffTypeCountKeys,
	diffTypeLabels,
	diffTypes,
	emptyClassificationCounts,
	incrementCount,
	totalCount,
} from "../src/diff-types";

describe("diff-types", () => {
	it("lists every api-smart-diff classification once, from the most to the least severe", () => {
		expect(diffTypes).toEqual(["breaking", "risky", "non-breaking", "deprecated", "annotation", "unclassified"]);
		expect(new Set(diffTypes).size).toBe(diffTypes.length);
		expect([...diffTypes].sort()).toEqual([...Object.values(ClassifierType)].sort());
	});

	it("has a label and a count key for every type", () => {
		for (const type of diffTypes) {
			expect(diffTypeLabels[type]).toBeTruthy();
			expect(diffTypeCountKeys[type]).toBeTruthy();
		}
		expect(diffTypeLabels.risky).toBe("Risky");
		expect(diffTypeCountKeys["non-breaking"]).toBe("nonBreaking");
	});

	it("converts counter arrays and sums them", () => {
		const counts = countsFromArray([1, 2, 3, 4, 5, 6]);
		expect(counts).toEqual({ breaking: 1, risky: 2, nonBreaking: 3, deprecated: 4, annotation: 5, unclassified: 6 });
		expect(totalCount(counts)).toBe(21);
		expect(countsFromArray([])).toEqual(emptyClassificationCounts());
	});

	it("increments, adds and compares counters", () => {
		const a = emptyClassificationCounts();
		incrementCount(a, "risky");
		incrementCount(a, "deprecated");
		incrementCount(a, undefined);
		incrementCount(a, "unknown" as DiffType);
		expect(a).toEqual({ ...emptyClassificationCounts(), risky: 1, deprecated: 1 });

		const b = emptyClassificationCounts();
		addCounts(b, a);
		addCounts(b, a);
		expect(b.risky).toBe(2);
		expect(countsEqual(a, b)).toBe(false);
		expect(countsEqual(a, { ...a })).toBe(true);
	});
});
