// The ES module build imports its runtime dependencies instead of bundling them, so that an application and its own
// CodeMirror extensions share one copy of @codemirror/state and @codemirror/view (CodeMirror recognises extensions by
// identity). These tests check that every package the sources import at runtime is a `dependency` (and therefore
// installed with the package and kept external by the ES build), and that only the UMD build bundles dependencies.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

import config from "../../vite.config";

const root = path.resolve(import.meta.dirname, "../..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
};

const sourceFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(file);
		return entry.name.endsWith(".ts") ? [file] : [];
	});

const packageName = (specifier: string): string =>
	specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];

/** Packages imported at runtime (`import type` and `import { type X }`-only imports are erased) */
const runtimeImports = (): Set<string> => {
	const names = new Set<string>();
	for (const file of sourceFiles(path.join(root, "src"))) {
		const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
		for (const [statement, specifier] of source.matchAll(/^(?:import|export)\s[^;]*?from\s+["']([^"'.][^"']*)["']/gm)) {
			if (/^(?:import|export)\s+type\s/.test(statement)) continue;
			const list = statement.match(/\{([^}]*)\}/)?.[1];
			const hasDefaultOrNamespace = /^import\s+(?!\{)[\w*]/.test(statement);
			if (
				list &&
				!hasDefaultOrNamespace &&
				list.split(",").every((item) => !item.trim() || /^type\s/.test(item.trim()))
			) {
				continue;
			}
			names.add(packageName(specifier));
		}
	}
	return names;
};

describe("package dependencies", () => {
	it("lists every package imported at runtime in dependencies", () => {
		const imports = [...runtimeImports()].sort();
		expect(imports).toContain("@codemirror/state");
		expect(imports.filter((name) => !(name in pkg.dependencies))).toEqual([]);
	});

	it("keeps the dependencies external in the ES module and bundles them in the UMD build", () => {
		const builds = (Array.isArray(config.pack) ? config.pack : [config.pack]) as {
			format?: string;
			deps?: { alwaysBundle?: unknown; neverBundle?: unknown };
		}[];
		const esm = builds.find((build) => build.format === "esm");
		const umd = builds.find((build) => build.format === "umd");
		expect(esm?.deps?.alwaysBundle).toBeUndefined();
		expect(umd?.deps?.alwaysBundle).toEqual([/.*/]);
	});
});
