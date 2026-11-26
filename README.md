# api-diff-viewer

[![npm](https://img.shields.io/npm/v/api-diff-viewer)](https://www.npmjs.com/package/api-diff-viewer) [![npm downloads](https://img.shields.io/npm/dm/api-diff-viewer?label=downloads)](https://www.npmjs.com/package/api-diff-viewer) [![types](https://img.shields.io/npm/types/api-diff-viewer)](https://www.npmjs.com/package/api-diff-viewer) [![license](https://img.shields.io/github/license/udamir/api-diff-viewer)](LICENSE) [![docs](https://img.shields.io/badge/docs-udamir.github.io-2f6fde)](https://udamir.github.io/api-diff-viewer/)

A framework-free CodeMirror 6 component that renders the difference between two versions of an API document, side by side or inline, with every change classified by [api-smart-diff](https://github.com/udamir/api-smart-diff) 2.x as breaking, risky, non-breaking, deprecated, annotation or unclassified. It supports OpenAPI 3.0 / 3.1 / 3.2, AsyncAPI 2.x / 3.0, GraphApi 1.0 (GraphQL), ProtoApi (gRPC / Protocol Buffers) and JSON Schema documents.

**[Documentation](https://udamir.github.io/api-diff-viewer/)** · **[Getting started](https://udamir.github.io/api-diff-viewer/guide/getting-started)** · **[Live demo](https://udamir.github.io/api-diff-viewer/demo)** · **[API reference](https://udamir.github.io/api-diff-viewer/guide/api)** · **[Migration from 1.x](https://udamir.github.io/api-diff-viewer/guide/migration)**

## Features

- Side-by-side (two aligned editors) or inline view, YAML or JSON output
- Six change types with colour-coded gutter bars, fold counters and change badges, filterable
- Word- or character-level highlights inside changed lines
- Navigation API: next / previous change by type, go to a path, search keys and values
- Light and dark themes with colour overrides
- `ready` and `error` events, including unsupported documents and comparison problems
- Plain DOM and CodeMirror: works in any framework or none; UMD global `ApiDiffViewer`

## Install

```sh
npm install api-diff-viewer
```

api-smart-diff 2.x and CodeMirror are installed with the package (the UMD build bundles them); no stylesheet import is needed. See [Installation](https://udamir.github.io/api-diff-viewer/guide/installation) for the browser build and the requirements.

## Usage

```html
<div id="diff" style="height: 600px"></div>
```

```ts
import { createDiffViewer } from "api-diff-viewer";

const before = { openapi: "3.1.0", info: { title: "Pets", version: "1.0.0" }, paths: {} };
const after = { openapi: "3.1.0", info: { title: "Pets", version: "1.1.0", description: "Pet store" }, paths: {} };

const viewer = createDiffViewer(document.getElementById("diff")!, before, after, {
  mode: "side-by-side",
  showClassification: true,
});

viewer.on("ready", ({ summary }) => console.log(`${summary.total} changes, ${summary.breaking} breaking`));
viewer.on("error", ({ kind, message }) => console.error(kind, message)); // e.g. Swagger 2.0: "unsupported-spec"
```

The documents are parsed objects or JSON strings; parse YAML yourself (for example with js-yaml).

## Documentation

- [Introduction](https://udamir.github.io/api-diff-viewer/guide/) and [Installation](https://udamir.github.io/api-diff-viewer/guide/installation)
- [Getting started](https://udamir.github.io/api-diff-viewer/guide/getting-started) and [Usage](https://udamir.github.io/api-diff-viewer/guide/usage)
- [Options](https://udamir.github.io/api-diff-viewer/guide/options)
- [Change types and colours](https://udamir.github.io/api-diff-viewer/guide/change-types) and [Theming](https://udamir.github.io/api-diff-viewer/guide/theming)
- [Events and errors](https://udamir.github.io/api-diff-viewer/guide/events)
- [Web Worker](https://udamir.github.io/api-diff-viewer/guide/worker), [CodeMirror extensions](https://udamir.github.io/api-diff-viewer/guide/extensions) and [Navigation API](https://udamir.github.io/api-diff-viewer/guide/navigation)
- [API reference](https://udamir.github.io/api-diff-viewer/guide/api), [Migration from 1.x](https://udamir.github.io/api-diff-viewer/guide/migration) and [Changelog](https://udamir.github.io/api-diff-viewer/changelog)

## Development

Requires Node.js 22.18 or later and pnpm 10 (`corepack enable`). The toolchain is [Vite+](https://viteplus.dev) (`vp`).

```sh
pnpm install
pnpm run test --project unit  # unit tests
pnpm run check                # format, lint and type check (vp check)
pnpm run build                # library build (vp pack)
pnpm run docs:dev             # documentation portal and live demo
```

See [Contributing](https://udamir.github.io/api-diff-viewer/guide/contributing) for all commands.

## License

MIT
