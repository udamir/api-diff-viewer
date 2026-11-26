import path from "node:path";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

// the published 1.x file names (`main`, `module`, `exports` in package.json)
const fileName = "api-diff-viewer";

// the ES module imports its runtime dependencies (CodeMirror, Lezer, api-smart-diff, diff) from the packages listed in
// `dependencies`, so the application and its own CodeMirror extensions share one copy of @codemirror/state and
// @codemirror/view; the UMD build for `<script>` tags bundles every dependency. The declarations import the dependency
// types from their packages
// Vite 7's library default ("baseline-widely-available"), which built 1.x
const target = ["chrome107", "edge107", "firefox104", "safari16"];

// anything imported at runtime that is not in `dependencies` (for example a devDependency) would be bundled into the
// ES module: `onlyBundle: []` makes such an import fail the build instead
const esmDeps = { onlyBundle: [] as string[], dts: { alwaysBundle: [] } };
const umdDeps = { alwaysBundle: [/.*/], onlyBundle: false as const, dts: { alwaysBundle: [] } };

export default defineConfig({
	pack: [
		{
			// ES module with the bundled declarations (dist/index.d.ts) and the extracted stylesheet
			entry: { index: "src/index.ts" },
			format: "esm",
			platform: "browser",
			target,
			dts: true,
			sourcemap: true,
			deps: esmDeps,
			// like the Vite library build: identifiers mangled, whitespace kept
			minify: { compress: true, mangle: true, codegen: { removeWhitespace: false } },
			css: { fileName: `${fileName}.css`, minify: true },
			outputOptions: { entryFileNames: (chunk) => (chunk.name.endsWith(".d") ? "[name].ts" : `${fileName}.es.js`) },
		},
		{
			// UMD for `require` and `<script>` tags, exposes the `ApiDiffViewer` global
			entry: { index: "src/index.ts" },
			format: "umd",
			globalName: "ApiDiffViewer",
			platform: "browser",
			target,
			sourcemap: true,
			deps: umdDeps,
			minify: true,
			css: { fileName: `${fileName}.css`, minify: true },
			outputOptions: { entryFileNames: `${fileName}.umd.js` },
			clean: false,
		},
	],
	test: {
		projects: [
			// unit tests: pure functions, no browser needed
			{
				extends: true,
				test: {
					name: "unit",
					include: ["tests/**/*.test.ts"],
					environment: "node",
				},
			},
			// Storybook tests: the play functions run in a real browser
			{
				extends: true,
				plugins: [storybookTest({ configDir: path.join(import.meta.dirname, ".storybook") })],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: "chromium" }],
					},
					setupFiles: [".storybook/vitest.setup.ts"],
				},
			},
		],
	},
	lint: {
		// the Biome scope of 1.x: src/, tests/ and the root configs
		ignorePatterns: [
			"dist/**",
			"storybook-static/**",
			"coverage/**",
			"temp/**",
			".storybook/**",
			"storybook/**",
			// the documentation portal: the VitePress cache and build (its config and theme sources are checked)
			"docs/.vitepress/cache/**",
			"docs/.vitepress/dist/**",
		],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	fmt: {
		// the Biome formatting style of 1.x
		useTabs: true,
		tabWidth: 2,
		printWidth: 120,
		singleQuote: false,
		semi: true,
		trailingComma: "es5",
		endOfLine: "lf",
		ignorePatterns: [
			"dist/**",
			"storybook-static/**",
			"coverage/**",
			"temp/**",
			"docs/.vitepress/cache/**",
			"docs/.vitepress/dist/**",
			"pnpm-lock.yaml",
			"*.md",
			// the Biome scope of 1.x: TypeScript in src/ and tests/ (plus the root configs); the Storybook stories,
			// stylesheets, HTML and JSON keep their own hand-written style
			".storybook/**",
			"storybook/**",
			"**/*.css",
			"**/*.html",
			"**/*.json",
		],
	},
});
