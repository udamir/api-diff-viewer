import path from "node:path";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

// the published 1.x file names (`main`, `module`, `exports` in package.json)
const fileName = "api-diff-viewer";

// both builds bundle every dependency (CodeMirror, api-smart-diff, diff), as the 1.x Vite library build did; the
// declarations keep importing the dependency types from their packages
// Vite 7's library default ("baseline-widely-available"), which built 1.x
const target = ["chrome107", "edge107", "firefox104", "safari16"];

const deps = { alwaysBundle: [/.*/], onlyBundle: false as const, dts: { alwaysBundle: [] } };

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
			deps,
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
			deps,
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
		// the Biome scope of 1.x: src/, tests/, examples/ and the root configs
		ignorePatterns: [
			"dist/**",
			"demo-dist/**",
			"storybook-static/**",
			"coverage/**",
			"temp/**",
			".storybook/**",
			"storybook/**",
			"demo/**",
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
			"demo-dist/**",
			"storybook-static/**",
			"coverage/**",
			"temp/**",
			"pnpm-lock.yaml",
			"*.md",
			// the Biome scope of 1.x: TypeScript in src/, tests/ and examples/ (plus the root configs); the Storybook
			// stories, the demo, stylesheets, HTML and JSON keep their own hand-written style
			".storybook/**",
			"storybook/**",
			"demo/**",
			"**/*.css",
			"**/*.html",
			"**/*.json",
		],
	},
});
