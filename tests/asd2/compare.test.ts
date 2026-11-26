/**
 * api-smart-diff 2.x integration: the `risky` (and `deprecated`) classifications, renames,
 * comparison errors, unsupported specifications, the original-value merged document and the
 * newly supported formats (OpenAPI 3.1, AsyncAPI 3.0, GraphApi 1.0, ProtoApi).
 */

import { apiCompare, type DiffType } from "api-smart-diff";
import { describe, expect, it } from "vitest";
import { type DiffBlockData, diffTypes, metaKey } from "../../src/diff-builder/common";
import { buildDiffBlock } from "../../src/diff-builder/index";
import { diffTypeCountKeys, totalCount } from "../../src/diff-types";
import { prepareFoldPlaceholder } from "../../src/extensions/fold-placeholder";
import { NavigationAPIImpl } from "../../src/navigation/navigation-api";
import { generateAlignedContentFromDiff } from "../../src/sync/side-by-side-alignment";
import type { DiffData, MergedDocument, MergedObject } from "../../src/types";
import { buildBlockTreeIndex } from "../../src/utils/block-index";
import { computeFilterFoldSetFromIndex } from "../../src/utils/filter";
import { compareDocuments, isCloneableCompareOptions } from "../../src/worker/compare";
import {
	asyncApi30After,
	asyncApi30Before,
	graphApi10After,
	graphApi10Before,
	openApi31After,
	openApi31Before,
	protoApiAfter,
	protoApiBefore,
	swagger2After,
	swagger2Before,
} from "../../storybook/samples/asd2";

/** The options the viewer always forces */
const viewerOptions = { metaKey: "$diff", arrayMeta: false } as const;

function setup(before: unknown, after: unknown) {
	const { merged, errors } = compareDocuments(before, after, viewerOptions);
	const root = buildDiffBlock(merged, "yaml");
	const diffData: DiffData = { blocks: [root], lineMap: [], blockMap: [] };
	const nav = new NavigationAPIImpl(null, null, diffData, merged);
	return { merged, errors, root, diffData, nav };
}

function findBlock(block: DiffBlockData, id: string): DiffBlockData | undefined {
	if (block.id === id) return block;
	for (const child of block.children) {
		const found = findBlock(child, id);
		if (found) return found;
	}
	return undefined;
}

/** Value at a path of plain keys (test helper for merged documents) */
// biome-ignore lint/suspicious/noExplicitAny: test helper over untyped JSON documents
const at = (node: unknown, ...keys: string[]): any =>
	keys.reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], node);

/** Number of diffs of each type returned by api-smart-diff */
function libraryCounts(before: unknown, after: unknown): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const diff of apiCompare(before, after, viewerOptions).diffs) counts[diff.type] = (counts[diff.type] ?? 0) + 1;
	return counts;
}

describe("api-smart-diff 2.x: six classifications", () => {
	it("the OpenAPI 3.1 sample produces all six diff types", () => {
		const counts = libraryCounts(openApi31Before, openApi31After);
		for (const type of diffTypes) {
			expect(counts[type], type).toBeGreaterThan(0);
		}
	});

	it("block counters, the change summary and the library agree on risky and deprecated", () => {
		const { root, nav } = setup(openApi31Before, openApi31After);
		const summary = nav.getChangeSummary();
		const library = libraryCounts(openApi31Before, openApi31After);

		expect(summary.risky).toBe(library.risky);
		expect(summary.deprecated).toBe(library.deprecated);
		expect(root.diffs[diffTypes.indexOf("risky")]).toBe(library.risky);
		expect(root.diffs[diffTypes.indexOf("deprecated")]).toBe(library.deprecated);
		// total is exactly the sum of the six buckets (no type is dropped)
		expect(summary.total).toBe(totalCount(summary));
	});

	it("the risky filter keeps the containers with risky changes open", () => {
		const { root } = setup(openApi31Before, openApi31After);
		const index = buildBlockTreeIndex([root]);
		const folded = computeFilterFoldSetFromIndex(index, ["risky"]);

		const riskyContainer = index.containersByMatchingType.get("risky");
		expect(riskyContainer?.size).toBeGreaterThan(0);
		for (const id of riskyContainer ?? []) expect(folded.has(id)).toBe(false);
		// info only has annotation changes: folded when filtering by risky
		expect(folded.has("info")).toBe(true);
	});

	it("navigation by type finds risky and deprecated changes", () => {
		const { nav } = setup(openApi31Before, openApi31After);
		expect(nav.goToNextChange("risky")).toContain("enum");
		expect(nav.goToNextChange("deprecated")).toBe("paths/~1pets/get/deprecated");
	});

	it("child key change counts are per type", () => {
		const { nav } = setup(openApi31Before, openApi31After);
		const components = nav.getChildKeys().find((c) => c.key === "components");
		expect(components?.changeCounts.risky).toBeGreaterThan(0);
		expect(components?.changeCounts.unclassified).toBeGreaterThan(0);
		expect(Object.keys(components?.changeCounts ?? {}).sort()).toEqual(Object.values(diffTypeCountKeys).sort());
	});

	it("child keys of an array report the item changes ({ array } meta on the parent)", () => {
		const { nav } = setup(openApi31Before, openApi31After);
		const params = nav.getChildKeys(["paths", "/pets", "get", "parameters"]);
		expect(params.map((p) => [p.key, p.hasDirectChange, p.action])).toEqual([
			["0", false, undefined],
			["1", false, undefined],
			["2", true, "add"],
		]);
		// the { array } wrapper is not a change of the "parameters" key itself
		const get = nav.getChildKeys(["paths", "/pets", "get"]).find((c) => c.key === "parameters");
		expect(get?.hasDirectChange).toBe(false);
		expect(get?.changeCounts.breaking).toBe(1);
		expect(get?.changeCounts.nonBreaking).toBe(1);
	});

	it("fold placeholders count risky and deprecated change roots", () => {
		const { root } = setup(openApi31Before, openApi31After);
		const alignment = generateAlignedContentFromDiff([root], "yaml");
		const lines = alignment.afterLines;
		const doc = {
			length: lines.join("\n").length,
			lineAt: (pos: number) => {
				let offset = 0;
				for (let i = 0; i < lines.length; i++) {
					if (pos <= offset + lines[i].length) return { number: i + 1 };
					offset += lines[i].length + 1;
				}
				return { number: lines.length };
			},
		};
		const state = { doc } as unknown as Parameters<typeof prepareFoldPlaceholder>[0];
		const data = prepareFoldPlaceholder(state, { from: 0, to: doc.length }, "unified", alignment.lineMap);
		expect(data.counts.risky).toBeGreaterThan(0);
		expect(data.counts.deprecated).toBe(1);
	});
});

describe("api-smart-diff 2.x: renames", () => {
	it("a renamed path template is one rename block with the before and after keys", () => {
		const { root, merged } = setup(openApi31Before, openApi31After);
		const paths = (merged as MergedObject).paths as MergedObject;
		const meta = (paths[metaKey] as unknown as Record<string, { action: string; replaced?: unknown }>)["/pets/{petId}"];
		expect(meta).toMatchObject({ action: "rename", replaced: "/pets/{id}" });

		const renamed = findBlock(root, "paths/~1pets~1{petId}");
		expect(renamed?.diff?.action).toBe("rename");

		const alignment = generateAlignedContentFromDiff([root], "yaml");
		expect(alignment.beforeLines.some((l) => l.includes("/pets/{id}:"))).toBe(true);
		expect(alignment.afterLines.some((l) => l.includes("/pets/{petId}:"))).toBe(true);
		expect(alignment.afterLines.some((l) => l.includes("/pets/{id}:"))).toBe(false);
	});
});

describe("api-smart-diff 2.x: merged document", () => {
	it("keeps an unchanged $ref as written and inlines a $ref whose target changed", () => {
		const doc = (petStatus: string[]) => ({
			openapi: "3.1.0",
			info: { title: "A", version: "1" },
			paths: {
				"/pets": {
					get: {
						responses: {
							"200": {
								description: "ok",
								content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } },
							},
							default: {
								description: "error",
								content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
							},
						},
					},
				},
			},
			components: {
				schemas: {
					Pet: { type: "object", properties: { status: { type: "string", enum: petStatus } } },
					Error: { type: "object", properties: { message: { type: "string" } } },
				},
			},
		});
		const { merged } = compareDocuments(doc(["a"]), doc(["a", "b"]), viewerOptions);
		const responses = at(merged, "paths", "/pets", "get", "responses");
		expect(responses.default.content["application/json"].schema).toEqual({ $ref: "#/components/schemas/Error" });
		expect(responses["200"].content["application/json"].schema.$ref).toBeUndefined();
		expect(responses["200"].content["application/json"].schema.properties.status.enum).toEqual(["a", "b"]);
	});

	it("every usage of a changed $ref target carries the item metadata (default array meta layout)", () => {
		// api-smart-diff 2.0.0 with arrayMeta: true loses the array meta of the second usage,
		// which is why the viewer uses the default { array } layout
		const { root } = setup(openApi31Before, openApi31After);
		const library = libraryCounts(openApi31Before, openApi31After);
		expect(root.diffs[diffTypes.indexOf("risky")]).toBe(library.risky);
	});

	it("keeps original input values and appends removed nodes after the after nodes", () => {
		const { merged } = compareDocuments(openApi31Before, openApi31After, viewerOptions);
		const pets = at(merged, "paths", "/pets");
		// the removed delete operation comes after the after-side get
		expect(Object.keys(pets).filter((k) => k !== metaKey)).toEqual(["get", "delete"]);
		// the merged document never aliases an input
		expect(pets.get).not.toBe(at(openApi31After, "paths", "/pets", "get"));
	});

	it("merged: normalized can still be requested through the options", () => {
		const options = { ...viewerOptions, merged: "normalized" as const };
		expect(() => compareDocuments(openApi31Before, openApi31After, options)).not.toThrow();
	});
});

describe("api-smart-diff 2.x: errors", () => {
	it("throws UnsupportedSpecError for Swagger 2.0 documents", () => {
		expect(() => compareDocuments(swagger2Before, swagger2After, viewerOptions)).toThrow(
			expect.objectContaining({ name: "UnsupportedSpecError" })
		);
	});

	it("throws UnsupportedSpecError for two different specifications", () => {
		expect(() => compareDocuments(openApi31Before, asyncApi30After, viewerOptions)).toThrow(
			expect.objectContaining({ name: "UnsupportedSpecError" })
		);
	});

	it("collects comparison errors (unresolved $ref) instead of throwing", () => {
		const before = {
			openapi: "3.1.0",
			info: { title: "A", version: "1" },
			paths: { "/a": { get: { responses: { "200": { $ref: "#/components/responses/Missing" } } } } },
		};
		const after = {
			openapi: "3.1.0",
			info: { title: "A", version: "2" },
			paths: { "/a": { get: { responses: { "200": { $ref: "#/components/responses/Other" } } } } },
		};
		const { errors, merged } = compareDocuments(before, after, viewerOptions);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toMatchObject({ kind: "ref" });
		// errors are structured-cloneable (no arbitrary `error` value)
		expect(errors[0]).not.toHaveProperty("error");
		expect(() => structuredClone(errors)).not.toThrow();
		expect(buildDiffBlock(merged, "yaml").children.length).toBeGreaterThan(0);
	});

	it("options with functions are not posted to a worker", () => {
		expect(isCloneableCompareOptions(undefined)).toBe(true);
		expect(isCloneableCompareOptions({ merged: "normalized", engine: "jsonschema" })).toBe(true);
		expect(isCloneableCompareOptions({ onError: () => {} })).toBe(false);
		expect(isCloneableCompareOptions({ annotateHook: () => "" })).toBe(false);
		expect(isCloneableCompareOptions({ rules: {} })).toBe(false);
	});
});

describe("api-smart-diff 2.x: new formats", () => {
	const cases: [string, unknown, unknown, DiffType[]][] = [
		["OpenAPI 3.1", openApi31Before, openApi31After, ["breaking", "risky", "deprecated", "unclassified"]],
		["AsyncAPI 3.0", asyncApi30Before, asyncApi30After, ["breaking", "risky", "annotation"]],
		["GraphApi 1.0", graphApi10Before, graphApi10After, ["breaking", "risky", "deprecated", "non-breaking"]],
		["ProtoApi 0.1", protoApiBefore, protoApiAfter, ["breaking", "risky", "non-breaking"]],
	];

	for (const [name, before, after, expectedTypes] of cases) {
		it(`${name} renders with the expected classifications`, () => {
			const { root, nav, errors } = setup(before, after);
			expect(errors).toEqual([]);
			expect(root.children.length).toBeGreaterThan(0);
			const summary = nav.getChangeSummary();
			for (const type of expectedTypes) {
				expect(summary[diffTypeCountKeys[type]], `${name} ${type}`).toBeGreaterThan(0);
			}
			expect(summary.total).toBe(totalCount(summary));

			const json = buildDiffBlock(compareDocuments(before, after, viewerOptions).merged as MergedDocument, "json");
			expect(json.diffs).toEqual(root.diffs);
		});
	}
});
