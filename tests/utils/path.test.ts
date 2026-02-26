import { describe, expect, it } from "vitest";
import { DiffBlockData, Token } from "../../src/diff-builder/common";
import {
	decodeSegment,
	encodeSegment,
	formatPath,
	getAncestorBlockIds,
	parsePath,
	resolvePathToBlock,
} from "../../src/utils/path";

// ─── encodeSegment / decodeSegment ─────────────────────────────────────

describe("encodeSegment", () => {
	it("encodes / to ~1", () => {
		expect(encodeSegment("/pets")).toBe("~1pets");
	});

	it("encodes ~ to ~0", () => {
		expect(encodeSegment("a~b")).toBe("a~0b");
	});

	it("encodes both ~ and / correctly", () => {
		expect(encodeSegment("~/path")).toBe("~0~1path");
	});

	it("returns unchanged string when no special chars", () => {
		expect(encodeSegment("info")).toBe("info");
	});

	it("handles empty string", () => {
		expect(encodeSegment("")).toBe("");
	});
});

describe("decodeSegment", () => {
	it("decodes ~1 to /", () => {
		expect(decodeSegment("~1pets")).toBe("/pets");
	});

	it("decodes ~0 to ~", () => {
		expect(decodeSegment("a~0b")).toBe("a~b");
	});

	it("decodes both ~0 and ~1 correctly", () => {
		expect(decodeSegment("~0~1path")).toBe("~/path");
	});

	it("returns unchanged string when no encoded chars", () => {
		expect(decodeSegment("info")).toBe("info");
	});
});

describe("encodeSegment/decodeSegment round-trip", () => {
	it.each([
		"simple",
		"/pets/{petId}",
		"~config",
		"a/b/c",
		"a~b~c",
		"~/mixed/~path",
		"",
	])('round-trips "%s"', (input) => {
		expect(decodeSegment(encodeSegment(input))).toBe(input);
	});
});

// ─── parsePath ─────────────────────────────────────────────────────────

describe("parsePath", () => {
	it("parses a string path into decoded segments", () => {
		expect(parsePath("info/description")).toEqual(["info", "description"]);
	});

	it("decodes segments during parsing", () => {
		expect(parsePath("paths/~1pets~1{petId}/get")).toEqual(["paths", "/pets/{petId}", "get"]);
	});

	it("returns the array as-is when given an array", () => {
		const arr = ["paths", "/pets", "get"];
		expect(parsePath(arr)).toBe(arr);
	});

	it("handles empty string", () => {
		expect(parsePath("")).toEqual([]);
	});

	it("handles single segment", () => {
		expect(parsePath("openapi")).toEqual(["openapi"]);
	});
});

// ─── formatPath ────────────────────────────────────────────────────────

describe("formatPath", () => {
	it("joins segments with /", () => {
		expect(formatPath(["info", "description"])).toBe("info/description");
	});

	it("encodes segments containing /", () => {
		expect(formatPath(["paths", "/pets/{petId}", "get"])).toBe("paths/~1pets~1{petId}/get");
	});

	it("encodes segments containing ~", () => {
		expect(formatPath(["a~b"])).toBe("a~0b");
	});

	it("handles empty array", () => {
		expect(formatPath([])).toBe("");
	});

	it("handles single segment", () => {
		expect(formatPath(["openapi"])).toBe("openapi");
	});
});

// ─── resolvePathToBlock ────────────────────────────────────────────────

describe("resolvePathToBlock", () => {
	function makeBlock(id: string, children: DiffBlockData[] = []): DiffBlockData {
		const block = new DiffBlockData(1, 0, [Token.Key("test")]);
		block.id = id;
		for (const child of children) {
			block.addBlock(child);
		}
		return block;
	}

	const leaf = makeBlock("info/title");
	const info = makeBlock("info", [leaf]);
	const root = makeBlock("");
	root.addBlock(info);
	const blocks = [root];

	it("finds a block by string path", () => {
		const found = resolvePathToBlock("info", blocks);
		expect(found).toBe(info);
	});

	it("finds a nested block", () => {
		const found = resolvePathToBlock("info/title", blocks);
		expect(found).toBe(leaf);
	});

	it("finds a block by array path", () => {
		const found = resolvePathToBlock(["info", "title"], blocks);
		expect(found).toBe(leaf);
	});

	it("returns null when block not found", () => {
		expect(resolvePathToBlock("nonexistent", blocks)).toBeNull();
	});
});

// ─── getAncestorBlockIds ───────────────────────────────────────────────

describe("getAncestorBlockIds", () => {
	function makeBlock(id: string, children: DiffBlockData[] = []): DiffBlockData {
		const block = new DiffBlockData(1, 0, [Token.Key("test")]);
		block.id = id;
		for (const child of children) {
			block.addBlock(child);
		}
		return block;
	}

	it("returns ancestor IDs for a nested path", () => {
		const responses = makeBlock("paths/~1pets/get/responses");
		const get = makeBlock("paths/~1pets/get", [responses]);
		const pets = makeBlock("paths/~1pets", [get]);
		const paths = makeBlock("paths", [pets]);
		const root = makeBlock("");
		root.addBlock(paths);
		const blocks = [root];

		const ancestors = getAncestorBlockIds("paths/~1pets/get/responses", blocks);
		expect(ancestors).toEqual(["paths", "paths/~1pets", "paths/~1pets/get"]);
	});

	it("returns empty array for root-level path", () => {
		const info = makeBlock("info");
		const root = makeBlock("");
		root.addBlock(info);
		const blocks = [root];

		expect(getAncestorBlockIds("info", blocks)).toEqual([]);
	});

	it("only includes ancestors that exist as blocks", () => {
		// If intermediate blocks don't exist, they shouldn't be in the result
		const deep = makeBlock("a/b/c");
		const root = makeBlock("");
		root.addBlock(deep);
		const blocks = [root];

		// 'a' and 'a/b' don't exist as blocks
		expect(getAncestorBlockIds("a/b/c", blocks)).toEqual([]);
	});
});
