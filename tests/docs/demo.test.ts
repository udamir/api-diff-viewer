// The helpers of the live demo (docs/demo.md): presets, editor parsing, share links and the code snippet. The page
// runs the same modules in the browser.

import { apiCompare } from "api-smart-diff";
import { describe, expect, it } from "vitest";

import {
	DEFAULT_OPTIONS,
	type DemoOptions,
	convertText,
	decodeState,
	encodeState,
	formatOf,
	mergeOptionsOf,
	optionsCode,
	parseDocument,
	serialize,
	specLabel,
} from "../../docs/.vitepress/theme/demo";
import { PRESETS } from "../../docs/.vitepress/theme/presets";

describe("demo presets", () => {
	it.each(PRESETS.filter((preset) => preset.id !== "swagger-2.0"))("$id compares with changes", (preset) => {
		const { diffs } = apiCompare(preset.before, preset.after);
		expect(diffs.length).toBeGreaterThan(0);
	});

	it("swagger-2.0 is rejected (the demo shows the error event)", () => {
		const preset = PRESETS.find((item) => item.id === "swagger-2.0")!;
		expect(() => apiCompare(preset.before, preset.after)).toThrow(/Swagger 2.0/);
	});

	it.each(PRESETS)("$id survives the YAML and JSON editors", (preset) => {
		for (const format of ["yaml", "json"] as const) {
			const text = serialize(preset.before, format);
			expect(formatOf(text)).toBe(format);
			expect(parseDocument(text)).toEqual(JSON.parse(JSON.stringify(preset.before)));
		}
	});

	it("labels the specifications", () => {
		expect(PRESETS.map((preset) => specLabel(preset.before))).toEqual([
			"OpenAPI 3.1.0",
			"OpenAPI 3.0.1",
			"AsyncAPI 3.0.0",
			"AsyncAPI 2.4.0",
			"GraphApi 1.0",
			"ProtoApi 0.1",
			"JSON Schema",
			"Swagger 2.0 is not supported",
		]);
	});
});

describe("demo editors", () => {
	it("rejects empty and scalar documents", () => {
		expect(() => parseDocument("  ")).toThrow(/empty/);
		expect(() => parseDocument("just text")).toThrow(/not an object/);
		expect(() => parseDocument("a: [")).toThrow();
	});

	it("converts between YAML and JSON and keeps text that does not parse", () => {
		expect(convertText("a: 1\n", "json")).toBe('{\n  "a": 1\n}\n');
		expect(convertText('{"a": 1}', "yaml")).toBe("a: 1\n");
		expect(convertText("a: [", "json")).toBe("a: [");
	});
});

describe("demo share links", () => {
	const options: DemoOptions = { ...DEFAULT_OPTIONS, mode: "inline", filters: ["breaking"], engine: "jsonschema" };

	it("restores documents and options", async () => {
		const hash = await encodeState({ before: "a: 1\n", after: "a: 2\n" }, options);
		expect(hash.startsWith("z.")).toBe(true);
		expect(await decodeState(hash)).toEqual({
			before: "a: 1\n",
			after: "a: 2\n",
			options: { mode: "inline", filters: ["breaking"], engine: "jsonschema" },
		});
	});

	it("ignores invalid links and unknown options", async () => {
		expect(await decodeState("not-a-state")).toBeUndefined();
		expect(await decodeState("z.AAAA")).toBeUndefined();
		const plain = btoa(JSON.stringify({ before: "a", after: "b", options: { unknown: 1, wordWrap: false } }));
		expect(await decodeState(plain)).toEqual({ before: "a", after: "b", options: { wordWrap: false } });
	});
});

describe("demo code snippet", () => {
	it("passes only the options that differ from the viewer defaults", () => {
		expect(mergeOptionsOf(DEFAULT_OPTIONS)).toEqual({});
		expect(mergeOptionsOf({ ...DEFAULT_OPTIONS, merged: "normalized", engine: "openapi" })).toEqual({
			merged: "normalized",
			engine: "openapi",
		});
		const code = optionsCode({ ...DEFAULT_OPTIONS, enableFolding: false, showClassification: false }, false);
		expect(code).toContain("const viewer = createDiffViewer(container, before, after);");
		const custom = optionsCode({ ...DEFAULT_OPTIONS, mode: "inline", merged: "normalized" }, true);
		expect(custom).toContain('mode: "inline"');
		expect(custom).toContain("dark: true");
		expect(custom).toContain('mergeOptions: { merged: "normalized" }');
	});
});
