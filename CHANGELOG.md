# Changelog

## 1.2.0

The viewer compares documents with api-smart-diff 2.x instead of 1.x. `createDiffViewer`, the `DiffViewer` methods and the options keep their names; what changes for code written for 1.1 is listed under "Breaking changes", step by step in [Migration from 1.1](https://udamir.github.io/api-diff-viewer/guide/migration).

### Highlights

- **More document formats.** OpenAPI 3.1 and 3.2 are compared with their own rules (1.1 used the OpenAPI 3.0 rules for them), and AsyncAPI 3.0, GraphQL in the GraphApi 1.0 encoding and gRPC / Protocol Buffers in the ProtoApi encoding are supported next to OpenAPI 3.0, AsyncAPI 2.x and JSON Schema.
- **Six change types.** `risky` (new in api-smart-diff 2.x) and `deprecated` changes have their own counters, colours, filters and badges next to `breaking`, `non-breaking`, `annotation` and `unclassified`; in 1.1 a deprecated change had no counter and no colour.
- **Renames are shown as renames.** A renamed component, for example a schema renamed from `Pet` to `Animal` with its `$ref`s updated, is one change with the old key on the before side and the new key on the after side, instead of a removal plus an addition.
- **Errors you can handle.** Documents that cannot be compared emit `error` with a `kind` (`"unsupported-spec"`, `"invalid-input"`, `"internal"`), and problems inside a comparison that still rendered, such as an unresolved `$ref`, arrive as `errors` with `ready`.
- **Your CodeMirror extensions work.** The ES module uses the CodeMirror packages installed in your application instead of its own bundled copy, so extensions and themes created with your `@codemirror/*` packages take effect (1.1 silently ignored them) and the application can load CodeMirror once.

### Breaking changes

API and TypeScript:

- Change counts by type: `ChangeSummary`, `ClassificationCounts` and `BadgeData` have two more counters, `risky` and `deprecated`, and `ChangeSummary.total` is the sum of the six counters (in 1.1 `total` also counted deprecated changes that no counter showed). `DiffType` (from api-smart-diff) has the value `"risky"`. Add `risky` and `deprecated` wherever you list change types (filters, legends, colour maps, exhaustive `switch`es), or derive the list from the new `diffTypes` export.
- `ready` passes `{ summary, errors }` (was `{ summary }`), and `error` passes a `DiffViewerError` `{ message, kind, name?, cause? }` (was `{ message, cause? }`); `message` is the error's own message (was `String(error)`, for example `"Error: ..."`). Code that destructures the payloads keeps working; branch on `kind` to tell unsupported documents from other failures.
- With `useWorker: false` the constructor no longer throws when the documents cannot be compared; it emits `error` after the constructor returns, as `useWorker: true` already did. Move error handling from `try` / `catch` around `createDiffViewer` to an `error` handler.
- `ChildKeyInfo.changeCounts` (from `navigation.getChildKeys()`) is a `ClassificationCounts` object `{ breaking, risky, nonBreaking, deprecated, annotation, unclassified }` instead of a tuple of four numbers. Read the counts by key instead of by index.
- `DiffBlockData.diffs` has six entries in the order of `diffTypes` (`breaking`, `risky`, `non-breaking`, `deprecated`, `annotation`, `unclassified`): `non-breaking` moved from index 1 to 2, `annotation` from 2 to 4 and `unclassified` from 3 to 5. Update code that reads it by index.
- `ChangeBadgeWidget` takes `(counts, blockId)` with a `ClassificationCounts` object instead of `(breaking, nonBreaking, annotation, unclassified, blockId)` and exposes `counts` instead of the four count fields.
- `mergeOptions` is the api-smart-diff 2.x `CompareOptions` type instead of the 1.x `ComapreOptions`, so custom `rules` and `annotateHook` use the api-smart-diff 2.x types. See [Options](https://udamir.github.io/api-diff-viewer/guide/options#mergeoptions) for the options it accepts.
- `DiffThemeColors`, `lightColors` and `darkColors` no longer have `correspondingHighlight`, and the theme no longer sets `--diff-corresponding-highlight`: neither had any visible effect. Remove it from your `colors`; the block selected by navigation is highlighted with `--diff-selected-bg` and `--diff-selected-border` (see [Theming](https://udamir.github.io/api-diff-viewer/guide/theming)).
- Custom workers (`workerUrl`): the worker must call api-smart-diff 2.x `apiCompare` and reply with `{ id, type: "result", payload: { merged, errors } }` instead of the merged document, and with `{ id, type: "error", payload: { message, name } }` on failure. The options it receives contain `arrayMeta: false` (was `true`); pass them to `apiCompare` unchanged. See [Web Worker](https://udamir.github.io/api-diff-viewer/guide/worker) for a complete worker.

Results:

- Unsupported documents emit `error` with `kind: "unsupported-spec"` instead of being compared anyway: Swagger 2.0, OpenAPI 4 or later, AsyncAPI 4 or later, unknown GraphApi versions and two documents of different specifications (1.1 compared them, mostly as plain values with unclassified changes), and AsyncAPI 1.x (1.1 threw "Unsupported version: 1.x"). Convert Swagger 2.0 to OpenAPI 3, or pass `mergeOptions: { engine: "jsonschema" }` to compare the documents as plain values as 1.1 did.
- GraphApi 0.1.2 documents, which 1.1 compared, emit `error` with `kind: "unsupported-spec"`: api-smart-diff 2.x compares GraphQL in the GraphApi 1.0 encoding only. Rebuild both documents from the GraphQL SDL with gqlapi 0.6 or later, which writes GraphApi 1.0.
- The documents are shown as written: path-level parameters stay on the path item (1.1 moved them into each operation), unchanged `$ref`s stay `$ref`s (1.1 showed the referenced content), and removed keys and array items are shown at the end of their container (1.1 kept them at their before position). Navigation paths (`goToPath`, `findPaths`, `getChildKeys`, `togglePath`) follow that content, so a path that only existed in the 1.1 content, for example a path-level parameter under `.../get/parameters/0`, no longer resolves. Pass `mergeOptions: { merged: "normalized" }` to show the compared values instead, with path-level parameters in the operations as in 1.1.
- Classifications and counts of the same documents differ from 1.1, because api-smart-diff 2.x rewrote its rules, adds the `risky` type and reports renames as one change: on the "OpenAPI 3.0: pet API" documents of the live demo, 1.1 reports 49 changes (8 breaking, 28 non-breaking, 13 annotation) and 1.2 reports 48 (6 breaking, 7 risky, 27 non-breaking, 8 annotation). Re-check snapshots or gates that depend on specific counts or classes.

Package and runtime:

- The ES module (`import`) no longer contains its dependencies: it imports `@codemirror/*`, `@lezer/highlight`, `api-smart-diff` and `diff` by package name, which makes `dist/api-diff-viewer.es.js` 132 kB instead of 718 kB (35 kB instead of 195 kB gzipped). With a package manager and a bundler nothing changes (they are `dependencies` and are installed with the package). A `<script type="module">` that loaded `dist/api-diff-viewer.es.js` from a CDN needs an import map, a CDN that rewrites bare imports, or the UMD build. See [Installation](https://udamir.github.io/api-diff-viewer/guide/installation#dependencies).
- The UMD build is still self-contained and, with the api-smart-diff 2.x engines, larger: 802 kB instead of 476 kB (248 kB instead of 150 kB gzipped).
- The type declarations are one bundled file, `dist/index.d.ts`; the per-module declaration files under `dist/` (`dist/diff-viewer.d.ts`, `dist/extensions/*.d.ts`, `dist/utils/*.d.ts`, ...) are gone. Import every type from `"api-diff-viewer"`; nothing that the package root exported was removed.
- Node.js 22 or later is required (`engines`), the requirement of allof-merge, a dependency of api-smart-diff 2.x. This matters for tooling and SSR builds that load the package in Node.js.

### New

- `api-diff-viewer/style.css`: the optional stylesheet (`dist/api-diff-viewer.css`, the colour variables with light defaults on `:root` and dark values on `.dark` / `[data-theme="dark"]`) is in the package exports, so `import "api-diff-viewer/style.css"` works with bundlers. The editor themes set their own colours, so the import is not required.
- `getCompareErrors()`: the problems api-smart-diff reported inside the last comparison (api-smart-diff `CompareError` entries without the thrown `error` value), the same list as `errors` of `ready`.
- `DiffViewerError` and `DiffViewerErrorKind`: the type of the `error` payload and of its `kind`.
- `diffTypes`, `diffTypeLabels` and `diffTypeCountKeys`: the six change types from the most to the least severe, their labels (`"Non-breaking"`, ...) and their `ChangeSummary` / `ClassificationCounts` keys (`"non-breaking"` → `nonBreaking`), for legends and filters: `diffTypes.map((type) => diffTypeLabels[type] + ": " + summary[diffTypeCountKeys[type]])`.
- Colours for the new types: `riskyColor` and `deprecatedColor` in `DiffThemeColors` (CSS variables `--diff-risky-color`, `--diff-deprecated-color` and `--diff-badge-risky-*`, `--diff-badge-deprecated-*`), and the classes `cm-diff-type-risky`, `cm-diff-fold-badge-risky`, `cm-change-badge-risky` (and `-deprecated`). See [Change types and colours](https://udamir.github.io/api-diff-viewer/guide/change-types).
- `mergeOptions` accepts the api-smart-diff 2.x options, among them `merged: "normalized"` (show the compared, normalized values: path-level parameters moved into the operations, `allOf` merged, defaults filled in), `engine` (force an engine, for example `"jsonschema"`), `components: "usage" | "unclassified"` and `onError` (receive the comparison problems yourself). Options that hold functions (`rules`, `extensions`, `annotateHook`, `onError`) make the comparison run on the main thread, since functions cannot be posted to a worker.
- `DiffWorkerManager.compare(before, after, options)` returns `{ merged, errors }`; `merge` still returns the merged document.

### Fixes

- CodeMirror extensions and base themes created with the application's own `@codemirror/*` packages (`extensions`, `theme`) take effect with the ES module; 1.1 silently ignored them, because its ES module contained its own copy of CodeMirror. See [CodeMirror extensions](https://udamir.github.io/api-diff-viewer/guide/extensions#one-codemirror-instance).
- `mergeOptions.externalSources` is used: external `$ref`s are resolved from the documents passed for each side and their changes are shown; 1.1 accepted the option but ignored it.
- An array whose items changed is no longer marked with the change of its items: the array line is not shown as added or replaced, and the summary counts each changed item once instead of the array.
- `getChildKeys()` on an array reports `hasDirectChange`, `diffType` and `action` of its changed items (they were always unset).
- A string input that is not valid JSON, a YAML string for example, emits `error` with `kind: "invalid-input"` and a message that says so; 1.1 threw a `TypeError` from the constructor or showed an empty diff. Parse YAML yourself (for example with js-yaml) and pass the object.
- `import "api-diff-viewer/style.css"`, shown in the 1.1 documentation of `createDiffViewer`, resolves (the file was not in the package exports).

### Requirements

- Node.js 22 or later (1.1 declared no requirement).
- Browsers: the build targets Chrome / Edge 107, Firefox 104 and Safari 16 or later, as in 1.1.

## Earlier versions

Earlier releases: https://github.com/udamir/api-diff-viewer/releases
