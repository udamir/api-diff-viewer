// The API reference page (docs/guide/api.md) documents every public export of the package entry (src/index.ts). This
// test collects the exports from the sources (following `export * from` re-exports) and fails when an export is not
// listed on the page, or when the page lists a name the entry does not export. It also checks the runtime exports
// against the module itself, so the collector cannot drift from what the entry really exports.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import * as api from "../../src/index";

const root = path.resolve(import.meta.dirname, "../..");
const entry = path.join(root, "src/index.ts");
const page = path.join(root, "docs/guide/api.md");

const resolveModule = (from: string, specifier: string): string => {
	const base = path.resolve(path.dirname(from), specifier);
	for (const candidate of [`${base}.ts`, path.join(base, "index.ts"), base]) {
		if (existsSync(candidate)) return candidate;
	}
	throw new Error(`cannot resolve ${specifier} from ${from}`);
};

const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Names exported by a module: declarations, export lists (with aliases) and `export *` re-exports */
const collectExports = (file: string, seen = new Set<string>()): Map<string, "type" | "value"> => {
	const names = new Map<string, "type" | "value">();
	if (seen.has(file)) return names;
	seen.add(file);
	const source = stripComments(readFileSync(file, "utf8"));

	for (const [, specifier] of source.matchAll(/^export\s+\*\s+from\s+["']([^"']+)["']/gm)) {
		for (const [name, kind] of collectExports(resolveModule(file, specifier), seen)) names.set(name, kind);
	}
	for (const [, typeOnly, list] of source.matchAll(/^export\s+(type\s+)?\{([^}]*)\}/gm)) {
		for (const item of list.split(",")) {
			const trimmed = item.trim();
			if (!trimmed) continue;
			const itemType = typeOnly || trimmed.startsWith("type ");
			const name = trimmed
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)
				.pop()!
				.trim();
			names.set(name, itemType ? "type" : "value");
		}
	}
	for (const [, keyword, name] of source.matchAll(
		/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm
	)) {
		names.set(name, keyword === "interface" || keyword === "type" ? "type" : "value");
	}
	return names;
};

/** Names in the first column of the reference tables: `| \`name\` | ... |` */
const documentedNames = (markdown: string): Set<string> =>
	new Set([...markdown.matchAll(/^\|\s*`([A-Za-z_$][\w$]*)`\s*\|/gm)].map(([, name]) => name));

describe("API reference (docs/guide/api.md)", () => {
	const exported = collectExports(entry);
	const documented = documentedNames(readFileSync(page, "utf8"));

	it("collects the runtime exports of the entry", () => {
		const runtime = Object.keys(api).sort();
		const collected = [...exported].filter(([, kind]) => kind === "value").map(([name]) => name);
		expect(runtime.filter((name) => !exported.has(name))).toEqual([]);
		expect(collected.filter((name) => !runtime.includes(name))).toEqual([]);
	});

	it("documents every export", () => {
		expect([...exported.keys()].filter((name) => !documented.has(name)).sort()).toEqual([]);
	});

	it("documents only exported names", () => {
		expect([...documented].filter((name) => !exported.has(name)).sort()).toEqual([]);
	});
});
