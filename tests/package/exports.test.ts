// The package `exports` decide which specifiers resolve in bundlers and Node.js. These tests check the documented
// specifiers against the `exports` map of package.json, so a stylesheet path in the docs or the JSDoc that the exports
// do not cover fails here. They read the map instead of resolving files, so they do not need a build (`dist/`).

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

const root = path.resolve(import.meta.dirname, "../..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
	name: string;
	exports: Record<string, unknown>;
};

/** The export target of `<name>/<subpath>`, or undefined when the exports map does not cover it. */
const exportTarget = (specifier: string): unknown => {
	const subpath = `.${specifier.slice(pkg.name.length)}`;
	return pkg.exports[subpath];
};

describe("package exports", () => {
	it("exports the stylesheet as api-diff-viewer/style.css", () => {
		expect(exportTarget(`${pkg.name}/style.css`)).toBe("./dist/api-diff-viewer.css");
	});

	it("exports package.json", () => {
		expect(exportTarget(`${pkg.name}/package.json`)).toBe("./package.json");
	});

	it("every stylesheet specifier in the docs, the README and the JSDoc is exported", () => {
		const files = [
			"README.md",
			"src/diff-viewer.ts",
			"docs/guide/installation.md",
			"docs/guide/theming.md",
			"docs/guide/getting-started.md",
		];
		const specifiers = new Set<string>();
		for (const file of files) {
			const source = readFileSync(path.join(root, file), "utf8");
			for (const [, specifier] of source.matchAll(/import\s+["'](api-diff-viewer\/[^"']+\.css)["']/g)) {
				specifiers.add(specifier);
			}
		}
		expect([...specifiers]).toContain("api-diff-viewer/style.css");
		for (const specifier of specifiers) {
			expect(exportTarget(specifier), specifier).toBeDefined();
		}
	});
});
