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

### Dependencies

The ES module imports its runtime dependencies instead of bundling them: CodeMirror (`@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@codemirror/commands`, `@codemirror/lang-json`, `@codemirror/lang-yaml`), `@lezer/highlight`, [api-smart-diff](https://udamir.github.io/api-smart-diff/) and `diff`. They are `dependencies` of the package, so the package manager installs them with it and your bundler resolves them from `node_modules`. Your application and the viewer therefore share one copy of CodeMirror, which is what makes your own [CodeMirror extensions](/guide/extensions) work. If your application also depends on `@codemirror/*` packages, keep them on compatible 6.x ranges so the package manager installs a single copy.

The UMD build (`dist/api-diff-viewer.umd.js`) is self-contained: it bundles all of these dependencies, for `<script>` tags and other setups without a package manager.

### api-smart-diff

api-diff-viewer 1.2 and later compares documents with [api-smart-diff](https://udamir.github.io/api-smart-diff/) 2.x. You do not install it yourself: it is a dependency of the package (its types are part of the viewer's API: `DiffType`, `CompareOptions`, `CompareError`), installed with it; the UMD build bundles it.

| api-diff-viewer | api-smart-diff | Documents |
| --- | --- | --- |
| 1.2 | 2.x (dependency; bundled in the UMD build) | OpenAPI 3.0 / 3.1 / 3.2, AsyncAPI 2.x / 3.0, GraphApi 1.0, ProtoApi, JSON Schema |
| 1.0 – 1.1 | 1.x (bundled) | OpenAPI 3.0, AsyncAPI 2.x, GraphApi 0.1.x, JSON Schema |

### Requirements

- **Browsers.** The bundle targets Chrome / Edge 107, Firefox 104 and Safari 16 or later.
- **Node.js.** The package declares Node.js 22 or later (`engines`), the requirement of a dependency of api-smart-diff 2.x. This matters for tooling and SSR builds that load the package in Node.js; the viewer itself needs a DOM, so create it in the browser only (for example in `onMounted` or `useEffect`).

## Browser global (UMD)

Without a bundler, load the UMD build with a `<script>` tag. It defines the global `ApiDiffViewer` with the same exports as the module:

```html
<div id="diff" style="height: 600px"></div>
<script src="https://unpkg.com/api-diff-viewer@1/dist/api-diff-viewer.umd.js"></script>
<script>
  const viewer = ApiDiffViewer.createDiffViewer(
    document.getElementById("diff"),
    { openapi: "3.1.0", info: { title: "Pets", version: "1.0.0" }, paths: {} },
    { openapi: "3.1.0", info: { title: "Pets", version: "1.1.0" }, paths: {} },
    { mode: "side-by-side" }
  );
</script>
```

The same file is available from jsDelivr: `https://cdn.jsdelivr.net/npm/api-diff-viewer@1/dist/api-diff-viewer.umd.js`. The ES module (`dist/api-diff-viewer.es.js`) imports its dependencies by package name, so a `<script type="module">` needs an import map for them or a CDN that rewrites the imports (for example `https://esm.sh/api-diff-viewer@1`).

## Stylesheet

You do not need to import a stylesheet. The viewer's look (colours, gutters, badges, word highlights) is applied by its CodeMirror themes, which set the colour variables on the editors themselves.

The package also contains a stylesheet, exported as `api-diff-viewer/style.css` (the file `dist/api-diff-viewer.css`). It only declares the [colour variables](/guide/theming#css-variables) with their light defaults on `:root` and their dark values on `.dark` / `[data-theme="dark"]`, which matters only for the few variables the editor themes do not set (selection, gutter and border colours). If you want it, import it next to the module:

```ts
import { createDiffViewer } from "api-diff-viewer";
import "api-diff-viewer/style.css";
```

Without a bundler, link it from a CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/api-diff-viewer@1/dist/api-diff-viewer.css" />
```

## TypeScript

The declarations are bundled (`dist/index.d.ts`) and import their dependency types from `api-smart-diff` and `@codemirror/*`, which are installed with the package. No `@types` package is needed.
