# Navigation API

`viewer.navigation` returns a `NavigationAPI` bound to the current editors: move through the changes, open a path, search the document and inspect its tree. It is rebuilt whenever the editors are rebuilt (mode or format change, `update`), so read `viewer.navigation` each time instead of keeping a reference. Before the first render it returns an inactive stub.

```ts
const nav = viewer.navigation;

nav.goToNextChange(); // any change
nav.goToNextChange("breaking", "risky"); // only these types
nav.goToPrevChange("breaking");
nav.goToPath(["paths", "/pets", "get"], { behavior: "smooth", align: "center", highlight: true });
```

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `goToNextChange(...types)` | `string \| null` | Scroll to the next changed block of the given types (any type when omitted) and highlight it; wraps around at the end. Returns its path, or `null` when there is no such change |
| `goToPrevChange(...types)` | `string \| null` | The same in reverse document order |
| `goToPath(path, options?)` | `void` | Scroll to a path, expanding its folded ancestors. Unknown paths are ignored |
| `findPaths(text, options?)` | `PathSearchResult[]` | Paths whose key or value contains `text`, in document order |
| `getChildKeys(path?)` | `ChildKeyInfo[]` | The child keys of a path (the root when omitted), with their change type and the change counts of their subtrees |
| `getChangeSummary()` | `ChangeSummary` | The change counters of the whole document |
| `getCurrentPath()` | `string \| null` | The path of the current change |
| `onNavigate(callback)` | `() => void` | Called with the path whenever the current path changes; returns an unsubscribe function. The viewer also emits it as the `navigate` event |

`types` are change types (`"breaking"`, `"risky"`, `"non-breaking"`, `"deprecated"`, `"annotation"`, `"unclassified"`).

## Paths

A path (`DiffPath`) is an array of keys, or a string of keys joined with `/` with JSON Pointer escaping inside a key (`~` → `~0`, `/` → `~1`) and no leading `/`. Array items are addressed by their index. Returned paths are strings.

```ts
nav.goToPath(["paths", "/pets/{id}", "get", "parameters", "0"]);
nav.goToPath("paths/~1pets~1{id}/get/parameters/0"); // the same
```

Paths follow the document the viewer shows: with the default `mergeOptions.merged: "original"` that is the documents as written (a path-level parameter stays under the path item, an unchanged `$ref` stays a `$ref`).

## Options

`NavigationOptions` for `goToPath`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `behavior` | `"smooth" \| "instant"` | `"smooth"` | Scroll behaviour |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Vertical position of the target |
| `highlight` | `boolean` | `true` | Highlight the target block |

`FindPathsOptions` for `findPaths`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `caseSensitive` | `boolean` | `false` | Case-sensitive matching |
| `searchIn` | `"keys" \| "values" \| "both"` | `"both"` | Where to search |
| `limit` | `number` | unlimited | Maximum number of results |

## Search box example

```ts
input.addEventListener("input", () => {
  const results = viewer.navigation.findPaths(input.value, { limit: 20 });
  list.replaceChildren(
    ...results.map(({ path, matchedText, matchLocation, diffType }) => {
      const item = document.createElement("li");
      item.textContent = `${path} (${matchLocation}: ${matchedText})${diffType ? ` ${diffType}` : ""}`;
      item.onclick = () => viewer.navigation.goToPath(path);
      return item;
    })
  );
});
```

## Tree inspection

`getChildKeys` returns, for each child of a path, its decoded key, its path, whether it has a direct change (`hasDirectChange`, `diffType`, `action`), whether it has children, and `changeCounts`, a `ClassificationCounts` object of the changes in its subtree. Use it to build an outline or a tree of the changes next to the viewer:

```ts
for (const child of viewer.navigation.getChildKeys(["paths"])) {
  console.log(child.key, child.changeCounts.breaking, child.changeCounts.nonBreaking);
}
```

`createNavigationAPI(beforeView, afterView, diffData, merged)` creates the same API for editors you build yourself from the exported extensions.
