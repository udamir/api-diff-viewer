# Changelog

## 1.2.0

The viewer compares documents with api-smart-diff 2.x instead of 1.x. `createDiffViewer`, the `DiffViewer` methods and the options keep their names; what changes for code written for 1.1 is listed under "Breaking changes", step by step in [Migration from 1.1](https://udamir.github.io/api-diff-viewer/guide/migration).

### Highlights

- **More document formats.** OpenAPI 3.1 and 3.2, AsyncAPI 3.0, GraphApi 1.0 (GraphQL) and ProtoApi (gRPC / Protocol Buffers) next to OpenAPI 3.0, AsyncAPI 2.x and JSON Schema.
- **All six change types.** `risky` (new in api-smart-diff 2.x) and `deprecated` are counted, coloured, filterable and navigable next to `breaking`, `non-breaking`, `annotation` and `unclassified`, and renamed paths, components, channels and messages are shown as one rename (the old key on the before side, the new key on the after side) instead of a removal plus an addition.
- **Errors are events.** Documents that cannot be compared emit `error` with a `kind` (`"unsupported-spec"`, `"invalid-input"`, `"internal"`), and problems inside a comparison that still rendered (an unresolved `$ref`, a custom rule that threw) arrive as `errors` with `ready`.
- **Documentation portal** at [udamir.github.io/api-diff-viewer](https://udamir.github.io/api-diff-viewer/) with the guide, the API reference and a [live demo](https://udamir.github.io/api-diff-viewer/demo) for OpenAPI, AsyncAPI, GraphApi, ProtoApi and JSON Schema documents.
- **Much smaller ES module.** `dist/api-diff-viewer.es.js` imports CodeMirror, `@lezer/highlight`, api-smart-diff and `diff` from the installed packages instead of bundling them: 132 kB instead of 718 kB (35 kB instead of 195 kB gzipped), and your own CodeMirror extensions and themes work with it.

### Breaking changes

- Change counts by type: `ChangeSummary`, `ClassificationCounts` and `BadgeData` have two more counters, `risky` and `deprecated`, and `ChangeSummary.total` is the sum of the six counters (in 1.1 `total` also counted deprecated changes that no counter showed). `DiffType` (from api-smart-diff) has the value `"risky"`. Add `risky` and `deprecated` wherever you list change types (filters, legends, colour maps, exhaustive `switch`es), or derive the list from the new `diffTypes` export.
- `ChildKeyInfo.changeCounts` (from `navigation.getChildKeys()`) is a `ClassificationCounts` object `{ breaking, risky, nonBreaking, deprecated, annotation, unclassified }` instead of a tuple of four numbers. Read the counts by key instead of by index.
- `DiffBlockData.diffs` has six entries in the order of `diffTypes` (`breaking`, `risky`, `non-breaking`, `deprecated`, `annotation`, `unclassified`): `non-breaking` moved from index 1 to 2, `annotation` from 2 to 4 and `unclassified` from 3 to 5. Update code that reads it by index.
- `ChangeBadgeWidget` takes `(counts, blockId)` with a `ClassificationCounts` object instead of `(breaking, nonBreaking, annotation, unclassified, blockId)` and exposes `counts` instead of the four count fields.
- `DiffThemeColors`, `lightColors` and `darkColors` no longer have `correspondingHighlight`, and the theme no longer sets `--diff-corresponding-highlight`: nothing ever used it. Remove it from your `colors`; the block selected by navigation is highlighted with `--diff-selected-bg` and `--diff-selected-border` (see [Theming](https://udamir.github.io/api-diff-viewer/guide/theming)).
- `mergeOptions` is the api-smart-diff 2.x `CompareOptions` type instead of the 1.x `ComapreOptions`; `annotateHook` is `(diff, ctx) => string`. See [Options](https://udamir.github.io/api-diff-viewer/guide/options#mergeoptions) for the options it accepts.
- `ready` passes `{ summary, errors }` (was `{ summary }`), and `error` passes a `DiffViewerError` `{ message, kind, name?, cause? }` (was `{ message, cause? }`); `message` is the error's own message (was `String(error)`, for example `"Error: ..."`). Code that destructures the payloads keeps working; branch on `kind` to tell unsupported documents from other failures.
- Unsupported documents are reported with an `error` event (`kind: "unsupported-spec"`) instead of being compared as plain JSON: Swagger 2.0, OpenAPI 4 or later, AsyncAPI 1.x or 4 or later, unknown GraphApi versions, GraphApi 0.1.2 (see below) and two documents of different specifications. Convert Swagger 2.0 to OpenAPI 3, or pass `mergeOptions: { engine: "jsonschema" }` to keep the 1.1 behaviour.
- With `useWorker: false` the constructor no longer throws when the documents cannot be compared; it emits `error` (after the constructor returns), as `useWorker: true` already did. Move error handling from `try` / `catch` around `createDiffViewer` to an `error` handler.
- String inputs must be JSON. A YAML string, which 1.1 accepted but compared as a plain string, is an `invalid-input` error. Parse YAML yourself (for example with js-yaml) and pass the object.
- The documents are shown as written: path-level parameters stay on the path item, unchanged `$ref`s stay `$ref`s, `allOf` is not merged, and removed keys and array items are shown at the end of their container. Navigation paths (`goToPath`, `findPaths`, `getChildKeys`, `togglePath`) follow that content, so a path that only existed in the 1.1 normalized document (for example a path-level parameter under `.../get/parameters/0`) no longer resolves. Pass `mergeOptions: { merged: "normalized" }` to get the 1.1-style content.
- Classifications and counts of the same documents differ from 1.1: api-smart-diff 2.x classifies changes inside shared components by their usages, reports a changed component at its declaration and at each usage, reports renames as one change and rewrote its rules. Re-check snapshots or gates that depend on specific counts or classes.
- Custom workers (`workerUrl`): the worker must call api-smart-diff 2.x `apiCompare` and reply with `{ id, type: "result", payload: { merged, errors } }` instead of the merged document, and with `{ id, type: "error", payload: { message, name } }` on failure. The options it receives contain `arrayMeta: false` (was `true`); pass them to `apiCompare` unchanged. See [Web Worker](https://udamir.github.io/api-diff-viewer/guide/worker) for a complete worker.
- The ES module (`import`) no longer contains its dependencies: it imports `@codemirror/*`, `@lezer/highlight`, `api-smart-diff` and `diff` by package name. With a package manager and a bundler nothing changes (they are `dependencies` and are installed with the package). A `<script type="module">` that loaded `dist/api-diff-viewer.es.js` from a CDN needs an import map or a CDN that rewrites imports (for example `https://esm.sh/api-diff-viewer@1`), or the UMD build. The UMD build is still self-contained, and with the api-smart-diff 2.x engines it is larger: 802 kB instead of 476 kB (248 kB instead of 150 kB gzipped). See [Installation](https://udamir.github.io/api-diff-viewer/guide/installation#dependencies).
- The type declarations are one bundled file, `dist/index.d.ts`; the per-module declaration files under `dist/` (`dist/diff-viewer.d.ts`, `dist/extensions/*.d.ts`, `dist/utils/*.d.ts`, ...) are gone. Import every type from `"api-diff-viewer"`; nothing that the package root exported was removed.
- Node.js 22 or later is required (`engines`), the requirement of a dependency of api-smart-diff 2.x. This matters for tooling and SSR builds that load the package in Node.js.

### New

- `api-diff-viewer/style.css`: the optional stylesheet (`dist/api-diff-viewer.css`, the colour variables with light defaults on `:root` and dark values on `.dark` / `[data-theme="dark"]`) is in the package exports, so `import "api-diff-viewer/style.css"` works with bundlers. The editor themes set their own colours, so the import is not required.
- `getCompareErrors()`: the problems api-smart-diff reported inside the last comparison (api-smart-diff `CompareError` entries without the thrown `error` value), the same list as `errors` of `ready`.
- `DiffViewerError` and `DiffViewerErrorKind`: the type of the `error` payload and of its `kind`.
- `diffTypes`, `diffTypeLabels` and `diffTypeCountKeys`: the six change types from the most to the least severe, their labels (`"Non-breaking"`, ...) and their `ChangeSummary` / `ClassificationCounts` keys (`"non-breaking"` → `nonBreaking`), for legends and filters: `diffTypes.map((type) => diffTypeLabels[type] + ": " + summary[diffTypeCountKeys[type]])`.
- Colours for the new types: `riskyColor` and `deprecatedColor` in `DiffThemeColors` (CSS variables `--diff-risky-color`, `--diff-deprecated-color` and `--diff-badge-risky-*`, `--diff-badge-deprecated-*`), and the classes `cm-diff-type-risky`, `cm-diff-fold-badge-risky`, `cm-change-badge-risky` (and `-deprecated`). See [Change types and colours](https://udamir.github.io/api-diff-viewer/guide/change-types).
- `mergeOptions` accepts the api-smart-diff 2.x options, among them `merged: "normalized"` (show the compared, normalized values as in 1.1), `engine` (force an engine, for example `"jsonschema"`), `components: "usage" | "unclassified"`, `externalSources` (resolved external `$ref` sources per side) and `onError` (receive the comparison problems yourself). Options that hold functions (`rules`, `extensions`, `annotateHook`, `onError`) make the comparison run on the main thread, since functions cannot be posted to a worker.
- `DiffWorkerManager.compare(before, after, options)` returns `{ merged, errors }`; `merge` still returns the merged document.

### Fixes

- Folding with filters active, or "Collapse all" (`foldAllInView`), in side-by-side mode no longer throws "Ranges must be added sorted by from position" when nested blocks are folded.
- An array whose items changed is no longer marked with the change of its first changed item: the array line is not shown as added or replaced, and the summary counts each item change instead of the array.
- `getChildKeys()` on an array reports `hasDirectChange`, `diffType` and `action` of its changed items (they were always unset).
- `import "api-diff-viewer/style.css"`, shown in the 1.1 example, resolves (the file was not in the package exports).
- CodeMirror extensions and base themes created with the application's own `@codemirror/*` packages (`extensions`, `theme`) work with the ES module; with 1.1 they failed with "multiple instances of @codemirror/state are loaded" because the ES module bundled its own copy of CodeMirror. See [CodeMirror extensions](https://udamir.github.io/api-diff-viewer/guide/extensions#one-codemirror-instance).

### Requirements

- Node.js 22 or later (was not declared).
- Browsers: the build targets Chrome / Edge 107, Firefox 104 and Safari 16 or later, as in 1.1.
- GraphApi 0.1.2 documents are no longer supported, because api-smart-diff 2.0.1 dropped that encoding: they are reported as `error` with `kind: "unsupported-spec"`. Rebuild both documents from the GraphQL SDL with gqlapi 0.6 or later, which writes GraphApi 1.0.

## Earlier versions

Earlier releases: https://github.com/udamir/api-diff-viewer/releases
