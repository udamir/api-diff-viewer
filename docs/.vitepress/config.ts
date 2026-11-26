import { defineConfig } from "vitepress";

import pkg from "../../package.json" with { type: "json" };

const REPO = "https://github.com/udamir/api-diff-viewer";

const GUIDE = {
	text: "Guide",
	items: [
		{ text: "Introduction", link: "/guide/" },
		{ text: "Installation", link: "/guide/installation" },
		{ text: "Getting started", link: "/guide/getting-started" },
		{ text: "Usage", link: "/guide/usage" },
		{ text: "Options", link: "/guide/options" },
	],
};

const CONCEPTS = {
	text: "Features",
	items: [
		{ text: "Change types and colours", link: "/guide/change-types" },
		{ text: "Theming", link: "/guide/theming" },
		{ text: "Events and errors", link: "/guide/events" },
		{ text: "Web Worker", link: "/guide/worker" },
		{ text: "CodeMirror extensions", link: "/guide/extensions" },
		{ text: "Navigation API", link: "/guide/navigation" },
	],
};

const REFERENCE = {
	text: "Reference",
	items: [
		{ text: "API reference", link: "/guide/api" },
		{ text: "Migration from 1.x", link: "/guide/migration" },
		{ text: "Contributing", link: "/guide/contributing" },
		{ text: "Changelog", link: "/changelog" },
	],
};

export default defineConfig({
	title: "api-diff-viewer",
	description:
		"Framework-free CodeMirror 6 viewer for the difference between two API documents: OpenAPI, AsyncAPI, GraphApi (GraphQL), ProtoApi (gRPC) and JSON Schema, classified with api-smart-diff 2.x.",
	// served from https://udamir.github.io/api-diff-viewer/
	base: "/api-diff-viewer/",
	cleanUrls: true,
	lastUpdated: true,
	head: [["link", { rel: "icon", type: "image/svg+xml", href: "/api-diff-viewer/favicon.svg" }]],
	vite: {
		build: {
			// the demo bundles the viewer with CodeMirror and api-smart-diff
			chunkSizeWarningLimit: 2000,
		},
	},
	themeConfig: {
		nav: [
			{ text: "Guide", link: "/guide/", activeMatch: "/guide/(?!api)" },
			{ text: "API", link: "/guide/api" },
			{ text: "Demo", link: "/demo" },
			{
				text: `v${pkg.version}`,
				items: [
					{ text: "Changelog", link: "/changelog" },
					{ text: "Migration from 1.x", link: "/guide/migration" },
					{ text: "Releases", link: `${REPO}/releases` },
					{ text: "npm", link: "https://www.npmjs.com/package/api-diff-viewer" },
				],
			},
		],
		sidebar: {
			"/guide/": [GUIDE, CONCEPTS, REFERENCE],
			"/changelog": [GUIDE, CONCEPTS, REFERENCE],
		},
		outline: { level: [2, 3] },
		search: { provider: "local" },
		socialLinks: [{ icon: "github", link: REPO }],
		editLink: {
			pattern: `${REPO}/edit/master/docs/:path`,
			text: "Edit this page on GitHub",
		},
		footer: {
			message: "Released under the MIT License.",
			copyright: "Copyright © Damir Yusipov",
		},
	},
});
