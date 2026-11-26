# Installation

## Package manager

::: code-group

```sh [npm]
npm install api-diff-viewer
```

```sh [pnpm]
pnpm add api-diff-viewer
```

```sh [yarn]
yarn add api-diff-viewer
```

:::

The package is an ES module (`dist/api-diff-viewer.es.js`) with a CommonJS / UMD build (`dist/api-diff-viewer.umd.js`) and bundled type declarations (`dist/index.d.ts`).

### api-smart-diff

api-diff-viewer 2.x compares documents with [api-smart-diff](https://udamir.github.io/api-smart-diff/) 2.x. You do not install it yourself: it is a dependency of the package (its types are part of the viewer's API: `DiffType`, `CompareOptions`, `CompareError`), and its code is bundled into the viewer's `dist`, together with CodeMirror and `diff`.

| api-diff-viewer | api-smart-diff | Documents |
| --- | --- | --- |
| 2.x | 2.x (bundled) | OpenAPI 3.0 / 3.1 / 3.2, AsyncAPI 2.x / 3.0, GraphApi 1.0, ProtoApi, JSON Schema |
| 1.x | 1.x (bundled) | OpenAPI 3.0, AsyncAPI 2.x, GraphApi 0.1.x, JSON Schema |

### Requirements

- **Browsers.** The bundle targets Chrome / Edge 107, Firefox 104 and Safari 16 or later.
- **Node.js.** The package declares Node.js 22 or later (`engines`), the requirement of a dependency of api-smart-diff 2.x. This matters for tooling and SSR builds that load the package in Node.js; the viewer itself needs a DOM, so create it in the browser only (for example in `onMounted` or `useEffect`).

## Browser global (UMD)

Without a bundler, load the UMD build with a `<script>` tag. It defines the global `ApiDiffViewer` with the same exports as the module:

```html
<div id="diff" style="height: 600px"></div>
<script src="https://unpkg.com/api-diff-viewer@2/dist/api-diff-viewer.umd.js"></script>
<script>
  const viewer = ApiDiffViewer.createDiffViewer(
    document.getElementById("diff"),
    { openapi: "3.1.0", info: { title: "Pets", version: "1.0.0" }, paths: {} },
    { openapi: "3.1.0", info: { title: "Pets", version: "1.1.0" }, paths: {} },
    { mode: "side-by-side" }
  );
</script>
```

The same file is available from jsDelivr: `https://cdn.jsdelivr.net/npm/api-diff-viewer@2/dist/api-diff-viewer.umd.js`. An ES module build for `<script type="module">` is at `dist/api-diff-viewer.es.js`.

## Stylesheet

You do not need to import a stylesheet. The viewer's look (colours, gutters, badges, word highlights) is applied by its CodeMirror themes, which set the colour variables on the editors themselves.

The package also contains a stylesheet, exported as `api-diff-viewer/style.css` (the file `dist/api-diff-viewer.css`). It only declares the [colour variables](/guide/theming#css-variables) with their light defaults on `:root` and their dark values on `.dark` / `[data-theme="dark"]`, which matters only for the few variables the editor themes do not set (selection, gutter and border colours). If you want it, import it next to the module:

```ts
import { createDiffViewer } from "api-diff-viewer";
import "api-diff-viewer/style.css";
```

Without a bundler, link it from a CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/api-diff-viewer@2/dist/api-diff-viewer.css" />
```

## TypeScript

The declarations are bundled (`dist/index.d.ts`) and import their dependency types from `api-smart-diff` and `@codemirror/*`, which are installed with the package. No `@types` package is needed.
