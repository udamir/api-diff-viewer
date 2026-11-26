/**
 * Diff classification types — the single place that lists the api-smart-diff
 * classifications the viewer renders, their order, labels and count keys.
 *
 * Every per-type structure (block counters, summaries, badges, gutter bars,
 * filters) is derived from this module, so a classification can never be
 * dropped silently again: `diffTypeCountKeys` is a `Record<DiffType, ...>`,
 * which fails to compile when api-smart-diff adds a type.
 */

import type { DiffType } from "api-smart-diff";

/** Per-type change counters (camelCase keys, as in `ChangeSummary`) */
export interface ClassificationCounts {
	breaking: number;
	risky: number;
	nonBreaking: number;
	deprecated: number;
	annotation: number;
	unclassified: number;
}

/** Key of a diff type in `ClassificationCounts` / `ChangeSummary` */
export const diffTypeCountKeys: Record<DiffType, keyof ClassificationCounts> = {
	breaking: "breaking",
	risky: "risky",
	"non-breaking": "nonBreaking",
	deprecated: "deprecated",
	annotation: "annotation",
	unclassified: "unclassified",
};

/** Human-readable label of each diff type (gutter titles, badges, aria labels) */
export const diffTypeLabels: Record<DiffType, string> = {
	breaking: "Breaking",
	risky: "Risky",
	"non-breaking": "Non-breaking",
	deprecated: "Deprecated",
	annotation: "Annotation",
	unclassified: "Unclassified",
};

/**
 * All diff types, from the most to the least severe. This is also the index
 * order of `DiffBlockData.diffs`.
 */
export const diffTypes: DiffType[] = ["breaking", "risky", "non-breaking", "deprecated", "annotation", "unclassified"];

/** A zeroed `ClassificationCounts` object */
export function emptyClassificationCounts(): ClassificationCounts {
	return { breaking: 0, risky: 0, nonBreaking: 0, deprecated: 0, annotation: 0, unclassified: 0 };
}

/** Convert a `diffs` counter array (indexed like `diffTypes`) into `ClassificationCounts` */
export function countsFromArray(diffs: readonly number[]): ClassificationCounts {
	const counts = emptyClassificationCounts();
	for (let i = 0; i < diffTypes.length; i++) {
		counts[diffTypeCountKeys[diffTypes[i]]] = diffs[i] ?? 0;
	}
	return counts;
}

/** Increment the counter of `type` (unknown types are ignored) */
export function incrementCount(counts: ClassificationCounts, type: DiffType | undefined): void {
	const key = type ? diffTypeCountKeys[type] : undefined;
	if (key) counts[key]++;
}

/** Sum of all counters */
export function totalCount(counts: ClassificationCounts): number {
	let total = 0;
	for (const type of diffTypes) total += counts[diffTypeCountKeys[type]];
	return total;
}

/** Add `source` counters into `target` */
export function addCounts(target: ClassificationCounts, source: ClassificationCounts): void {
	for (const type of diffTypes) {
		const key = diffTypeCountKeys[type];
		target[key] += source[key];
	}
}

/** Whether two counter objects are equal */
export function countsEqual(a: ClassificationCounts, b: ClassificationCounts): boolean {
	for (const type of diffTypes) {
		const key = diffTypeCountKeys[type];
		if (a[key] !== b[key]) return false;
	}
	return true;
}
