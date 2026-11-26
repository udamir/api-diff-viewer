// The package `exports` decide which specifiers resolve in bundlers and Node.js. These tests resolve the documented
// specifiers through the package's own `exports` (a package can import itself by name), so a stylesheet path in the
// docs or the JSDoc that the exports do not cover fails here.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "package.json"));
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { name: string };

describe("package exports", () => {
	it("exports the stylesheet as api-diff-viewer/style.css", () => {
		expect(require.resolve(`${pkg.name}/style.css`)).toBe(path.join(root, "dist/api-diff-viewer.css"));
	});

	it("exports package.json", () => {
		expect(require.resolve(`${pkg.name}/package.json`)).toBe(path.join(root, "package.json"));
	});

	it("every stylesheet specifier in the docs, the README and the JSDoc resolves", () => {
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
			expect(() => require.resolve(specifier), specifier).not.toThrow();
		}
	});
});
