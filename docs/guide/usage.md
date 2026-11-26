# Usage

`createDiffViewer(container, before, after, options?)` creates a `DiffViewer` (the same as `new DiffViewer(...)`) and renders the comparison into `container`. The instance has methods to change the display at runtime, replace the documents, fold blocks, navigate and clean up.

```ts
import { createDiffViewer } from "api-diff-viewer";

const viewer = createDiffViewer(container, before, after, { mode: "side-by-side", format: "yaml" });
```

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Element to render into; the viewer fills it, so give it a height |
| `before` | `object \| string` | The before document: a parsed document or a JSON string |
| `after` | `object \| string` | The after document: a parsed document or a JSON string |
| `options` | `DiffViewerOptions` | See [Options](/guide/options) |

## Display controls

Each setter changes the display without comparing the documents again. `setMode`, `setFormat`, `setWordDiffMode`, `setWordWrap`, `setFoldingEnabled` and `setClassificationEnabled` do nothing (and emit no event) when called with the current value; `setFilters` and `setTheme` always apply.

```ts
viewer.setMode("inline"); // "side-by-side" | "inline"; emits modeChange
viewer.getMode();

viewer.setFormat("json"); // "yaml" | "json"; emits formatChange
viewer.getFormat();

viewer.setFilters(["breaking", "risky"]); // [] shows everything
viewer.getFilters();

viewer.setTheme({ dark: true }); // emits themeChange
viewer.setTheme({ colors: { breakingColor: "#ff6b6b" } });
viewer.isDark();

viewer.setWordDiffMode("char"); // "word" | "char" | "none"
viewer.getWordDiffMode();

viewer.setWordWrap(false); // emits wordWrapChange; without wrapping both sides scroll horizontally together
viewer.getWordWrap();

viewer.setFoldingEnabled(true);
viewer.getFoldingEnabled();

viewer.setClassificationEnabled(true);
viewer.getClassificationEnabled();
```

`setMode`, `setFormat` and `setTheme({ theme })` rebuild the editors; the other setters reconfigure the existing ones.

## Replacing the documents

```ts
viewer.update(newBefore, newAfter);
```

`update` compares the new documents and re-renders. It emits `loading`, then `ready`, or `error` when the documents cannot be compared (the previous diff then stays on screen).

## Folding

```ts
viewer.expandAll(); // also clears the filters
viewer.collapseAll(); // also clears the filters
viewer.togglePath("paths/~1pets/get"); // a path string: segments joined with "/", JSON Pointer escaping...
viewer.togglePath(["paths", "/pets", "get"]); // ...or an array of segments
```

Path strings join the keys of the document with `/`, with `~` escaped as `~0` and `/` as `~1` inside a key (JSON Pointer escaping without the leading `/`), so the operation `get` of the path `/pets` is `paths/~1pets/get`. The array form needs no escaping. `encodeSegment`, `decodeSegment`, `parsePath` and `formatPath` convert between the forms (see the [API reference](/guide/api#path-utilities)).

## Filters

`filters` (option or `setFilters`) lists the change types to show. The viewer folds every block that contains no change of those types, so the matching changes stay visible with their context. An empty list shows everything.

```ts
const viewer = createDiffViewer(container, before, after, {
  filters: ["breaking"],
  enableFolding: true,
  showClassification: true,
});
```

## Summary and comparison problems

```ts
const summary = viewer.getChangeSummary();
// { total, breaking, risky, nonBreaking, deprecated, annotation, unclassified, byPath }

const problems = viewer.getCompareErrors();
// problems api-smart-diff reported in the last comparison (also passed with "ready")
```

`total` is the sum of the six counters; `byPath` maps a path to the change types and counts at that path. See [Events and errors](/guide/events).

## Navigation

`viewer.navigation` returns the [Navigation API](/guide/navigation): move to the next or previous change of a type, open a path, search keys and values and inspect subtrees.

```ts
viewer.navigation.goToNextChange("breaking");
viewer.navigation.goToPath(["paths", "/pets", "get"]);
```

## The CodeMirror editors

```ts
const { before, after } = viewer.getEditorViews(); // side-by-side
const { unified } = viewer.getEditorViews(); // inline
```

The editors are read-only `EditorView` instances. Use them to read the state or measure the layout; changing their content breaks the alignment of the two sides.

## Cleanup

```ts
viewer.destroy();
```

`destroy` removes the editors, terminates the worker and removes all event listeners. Later calls on the instance do nothing.

## Examples

### Inline mode with folding

```ts
createDiffViewer(container, before, after, {
  mode: "inline",
  enableFolding: true,
  showClassification: true,
});
```

### Toolbar buttons

```ts
document.getElementById("toggle-mode")!.onclick = () => {
  viewer.setMode(viewer.getMode() === "side-by-side" ? "inline" : "side-by-side");
};
document.getElementById("toggle-format")!.onclick = () => {
  viewer.setFormat(viewer.getFormat() === "yaml" ? "json" : "yaml");
};
document.getElementById("toggle-dark")!.onclick = () => {
  viewer.setTheme({ dark: !viewer.isDark() });
};
```

### Comparing other engine options

`mergeOptions` passes options to api-smart-diff, for example the normalized document of the 1.1 viewer or a forced engine:

```ts
createDiffViewer(container, before, after, { mergeOptions: { merged: "normalized" } });
createDiffViewer(container, swagger2Before, swagger2After, { mergeOptions: { engine: "jsonschema" } });
```
