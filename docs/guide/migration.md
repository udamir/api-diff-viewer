# Migration from 1.x

api-diff-viewer 2.0 compares documents with api-smart-diff 2.x. The API of the viewer is the same; what changes for 1.x users is listed below.

## Two more change types

`risky` (new in api-smart-diff 2.0) and `deprecated` (already produced by api-smart-diff 1.x but dropped by the viewer) are now counted, coloured, filterable and navigable.

- `ChangeSummary` has `risky` and `deprecated` counters, and `total` is now exactly the sum of the six counters.
- `DiffThemeColors` has `riskyColor` and `deprecatedColor` (CSS variables `--diff-risky-color` and `--diff-deprecated-color`, plus `--diff-badge-risky-*` and `--diff-badge-deprecated-*`).
- Add `"risky"` and `"deprecated"` to any filter list or legend you build (or derive them from `diffTypes`).
- Gutter bars, fold badges and change badges use the classes `cm-diff-type-risky`, `cm-diff-fold-badge-risky` and `cm-change-badge-risky` (and `-deprecated`).

## Breaking type changes

- `ChildKeyInfo.changeCounts` (from `navigation.getChildKeys()`) is a `ClassificationCounts` object (`{ breaking, risky, nonBreaking, deprecated, annotation, unclassified }`) instead of a tuple of four numbers.
- `DiffBlockData.diffs` has six entries in the order of `diffTypes` (`breaking`, `risky`, `non-breaking`, `deprecated`, `annotation`, `unclassified`): `annotation` moved from index 2 to 4 and `unclassified` from 3 to 5.
- `BadgeData` and `ClassificationCounts` gained `risky` and `deprecated`, and `ChangeBadgeWidget` takes `(counts, blockId)`.
- `DiffThemeColors`, `lightColors` and `darkColors` no longer have `correspondingHighlight` (and the theme no longer sets `--diff-corresponding-highlight`): no decoration ever read it. The blocks selected by navigation are highlighted in both editors with `--diff-selected-bg` and `--diff-selected-border` (see [Theming](/guide/theming#css-variables)).
- `mergeOptions` is the api-smart-diff 2.x `CompareOptions` type (the misspelled `ComapreOptions` type no longer exists; `annotateHook` is `(diff, ctx) => string`).

## Events

- `ready` also passes `errors`, the problems inside the comparison (see [Events and errors](/guide/events#comparison-problems)).
- `error` passes `kind` (and `name`).
- Unsupported documents (Swagger 2.0, ...) are reported with `error` instead of being compared as plain JSON. To keep the 1.x behaviour, pass `mergeOptions: { engine: "jsonschema" }`.
- The constructor no longer throws when `useWorker: false`; it emits `error`.

## String inputs must be JSON

A YAML string used to be compared as a plain string; it is now an `invalid-input` error. Parse YAML yourself and pass the object.

## Rendered content

The viewer shows the documents as written (api-smart-diff `merged: "original"`): path-level parameters stay on the path item, unchanged `$ref`s stay `$ref`s, `allOf` is not merged, and removed keys and array items are shown at the end of their container, after the after-side entries. A renamed key (a path template, a component, a channel) is one `rename` change: the before editor shows the old key, the after editor the new one.

Navigation paths (`goToPath`, `findPaths`, `getChildKeys`, `togglePath`) follow that document, so a path that only existed in the 1.x normalized document (for example a path-level parameter under `.../get/parameters/N`) no longer resolves. Pass `mergeOptions: { merged: "normalized" }` to get the 1.x-style content.

## Different classifications and counts

api-smart-diff 2.x classifies changes inside components by their usages, reports a changed component at the declaration and at each usage, produces `rename` changes for renamed paths, components, channels and messages, and rewrote its rules, so the counts of the same documents differ from 1.x. An array container no longer borrows the change of its first changed item, so the summary counts each item change instead of the container.

## Bundle size

The ES module no longer bundles its dependencies: it imports CodeMirror, `@lezer/highlight`, api-smart-diff and `diff` from the packages installed with it (see [Installation](/guide/installation#dependencies)), so it is about 130 kB, and your own CodeMirror extensions work with it. The UMD build still bundles everything; api-smart-diff 2.x (with its OpenAPI 3.2, AsyncAPI 3.0, GraphApi 1.0 and ProtoApi engines) makes it larger than in 1.x.

## Checklist

1. Add `risky` and `deprecated` wherever you list change types (filters, legends, colours).
2. Read `changeCounts` by key instead of by index; read `DiffBlockData.diffs` with the new indices.
3. Handle the `error` event (`kind`), and the `errors` of `ready` if you show comparison problems.
4. Parse YAML before passing it to the viewer.
5. If you rely on 1.x paths or content, set `mergeOptions: { merged: "normalized" }`.
