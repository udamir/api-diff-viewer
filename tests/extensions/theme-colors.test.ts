// Every colour key of the diff theme (`DiffThemeColors`, `lightColors`, `darkColors`) sets a CSS variable on the
// editors. A variable that no decoration, theme rule or stylesheet reads makes the key a no-op for users, so each one
// must be read somewhere in the sources.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { darkColors, lightColors } from "../../src/themes";

const root = path.resolve(import.meta.dirname, "../..");
const themesFile = path.join(root, "src/themes.ts");

const sourceFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === "codemirror" ? [] : sourceFiles(file);
		return /\.(ts|css)$/.test(entry.name) ? [file] : [];
	});

/** The `"--diff-...": colors.key` pairs the theme declares */
const declaredVariables = (): Map<string, string> => {
	const source = readFileSync(themesFile, "utf8");
	return new Map([...source.matchAll(/"(--diff-[\w-]+)":\s*colors\.(\w+)/g)].map(([, name, key]) => [key, name]));
};

describe("diff theme colours", () => {
	it("maps every colour key to a CSS variable", () => {
		const declared = declaredVariables();
		expect([...declared.keys()].sort()).toEqual(Object.keys(lightColors).sort());
		expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
	});

	it("reads every declared CSS variable in a decoration, theme rule or stylesheet", () => {
		const sources = sourceFiles(path.join(root, "src"))
			.map((file) => readFileSync(file, "utf8"))
			.join("\n");
		const unread = [...declaredVariables().values()].filter((name) => !sources.includes(`var(${name}`));
		expect(unread).toEqual([]);
	});
});
