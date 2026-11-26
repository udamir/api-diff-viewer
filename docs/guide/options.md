# Options

`createDiffViewer(container, before, after, options)` takes a `DiffViewerOptions` object. Every option is optional.

```ts
import { createDiffViewer, type DiffViewerOptions } from "api-diff-viewer";

const options: DiffViewerOptions = {
  mode: "side-by-side",
  format: "yaml",
  filters: [],
  dark: false,
  enableFolding: true,
  showClassification: true,
  wordDiffMode: "word",
  wordWrap: true,
};
```

## Reference

| Option | Type | Default | Description | At runtime |
| --- | --- | --- | --- | --- |
| `mode` | `"side-by-side" \| "inline"` | `"side-by-side"` | Two aligned editors, or one unified editor with removed and added lines interleaved | `setMode` |
| `format` | `"json" \| "yaml"` | `"yaml"` | Output format of the rendered documents | `setFormat` |
| `filters` | `DiffType[]` | `[]` | Change types to show; blocks without such a change are folded. Empty: show everything | `setFilters` |
| `dark` | `boolean` | `false` | Dark theme | `setTheme({ dark })` |
| `theme` | `Extension` | none | A base CodeMirror theme extension, added before the diff theme (see the [limitation](/guide/extensions#one-codemirror-instance)) | `setTheme({ theme })` |
| `colors` | `Partial<DiffThemeColors>` | `{}` | Colour overrides of the diff theme, see [Theming](/guide/theming) | `setTheme({ colors })` |
| `enableFolding` | `boolean` | `false` | Fold gutter and fold placeholders for objects and arrays | `setFoldingEnabled` |
| `showClassification` | `boolean` | `false` | Change type indicators: coloured gutter bars, counters on folded blocks, change badges | `setClassificationEnabled` |
| `wordDiffMode` | `"word" \| "char" \| "none"` | `"word"` | Granularity of the highlights inside a changed line | `setWordDiffMode` |
| `wordWrap` | `boolean` | `true` | Wrap long lines (the two sides keep equal line heights). `false`: no wrapping, the two sides scroll horizontally together | `setWordWrap` |
| `extensions` | `Extension[]` | `[]` | Additional CodeMirror extensions for every editor, see [CodeMirror extensions](/guide/extensions) | no (create a new viewer) |
| `useWorker` | `boolean` | `true` | Compare asynchronously; with `workerUrl`, in a Web Worker. See [Web Worker](/guide/worker) | no |
| `workerUrl` | `string` | `""` | URL of a module worker that runs the comparison, see [Web Worker](/guide/worker) | no |
| `mergeOptions` | `CompareOptions` | `{}` | Options passed to api-smart-diff `apiCompare`, see below | no (call `update`) |

`DiffType` and `CompareOptions` are api-smart-diff 2.x types; `Extension` is the CodeMirror `@codemirror/state` type; `DiffThemeColors` is exported by the viewer.

## mergeOptions

`mergeOptions` is passed to `apiCompare(before, after, mergeOptions)` of api-smart-diff 2.x. The most useful options:

| Option | Type | Description |
| --- | --- | --- |
| `merged` | `"original" \| "normalized"` | `"original"` (default): show the documents as written. `"normalized"`: show the values the engine compared (path-level parameters moved into the operations, `allOf` merged, ...), like the 1.x viewer |
| `engine` | `"openapi" \| "asyncapi" \| "graphapi" \| "protoapi" \| "jsonschema"` | Force an engine instead of detecting the specification, for example `"jsonschema"` to compare documents that would be rejected (Swagger 2.0) as plain JSON |
| `components` | `"usage" \| "unclassified"` | Classify changes inside shared components by their usages (default) or leave them unclassified |
| `externalSources` | `{ before?: Record<string, unknown>; after?: Record<string, unknown> }` | Resolved external `$ref` sources by file name |
| `rules`, `extensions` | `CompareRules`, `CompareExtensionRules` | Custom comparison rules |
| `annotateHook` | `AnnotateHook` | Custom change descriptions, `(diff, ctx) => string` |
| `onError` | `(error: CompareError) => void` | Receive the comparison problems yourself instead of `ready` / `getCompareErrors()` |

See the [api-smart-diff options](https://udamir.github.io/api-smart-diff/guide/options) for the full list.

`metaKey` and `arrayMeta` are always overridden: the viewer reads the change metadata from `$diff` on each changed node and from the parent of an array. Options that hold functions (`rules`, `extensions`, `annotateHook`, `onError`) cannot be posted to a worker, so a comparison with them runs on the main thread.

```ts
createDiffViewer(container, before, after, {
  mergeOptions: {
    merged: "normalized",
    externalSources: {
      before: { "common.yaml": commonV1 },
      after: { "common.yaml": commonV2 },
    },
  },
});
```

## Inputs

`before` and `after` are parsed documents or JSON strings. A string that is not valid JSON is an `invalid-input` [error](/guide/events#errors): the viewer has no YAML parser.
