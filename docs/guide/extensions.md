# CodeMirror extensions

The viewer is built from CodeMirror 6 editors. `extensions` adds your own CodeMirror extensions to every editor: search, active line highlighting, selection match highlighting, key bindings, and so on.

```ts
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { highlightActiveLine, keymap } from "@codemirror/view";
import { createDiffViewer } from "api-diff-viewer";

const viewer = createDiffViewer(container, before, after, {
  extensions: [search(), keymap.of(searchKeymap), highlightActiveLine(), highlightSelectionMatches()],
});
// Ctrl+F / Cmd+F opens the search panel of the focused editor
```

- The extensions are appended after the viewer's own extensions, so they cannot override the viewer's invariants (the editors stay read-only).
- In side-by-side mode each editor gets the extensions independently (each has its own search panel).
- The extensions are applied when the editors are created. To change them, `destroy()` the viewer and create a new one.
- `@codemirror/search` is not part of the viewer: install it yourself.

## One CodeMirror instance

CodeMirror recognises extensions by identity, so an editor only accepts extensions created with the same copy of `@codemirror/state` and `@codemirror/view` as the editor itself.

The published bundle (`dist/api-diff-viewer.es.js` and `.umd.js`) contains its own copy of CodeMirror. Extensions and base themes created from separately installed `@codemirror/*` packages are therefore rejected: the viewer emits an `error` event (`kind: "internal"`) with the CodeMirror message "Unrecognized extension value in extension set ... multiple instances of @codemirror/state are loaded", and the diff is not rendered. This applies to the `extensions` option and to the `theme` option (unless the theme is one of the viewer's exports, such as `diffThemeDark`).

The extensions work when the viewer and your code share one CodeMirror, which is the case when the viewer is compiled from its sources in the same build as your code (as in this portal's demo and in the repository's Storybook). With the published bundle, use the viewer's own options instead where they exist (`colors`, `dark`, `theme: diffThemeLight | diffThemeDark`, `wordWrap`, `enableFolding`).

## Viewer extensions

The package also exports the extensions the viewer is built from (decorations, gutters, word diff, fold badges, state fields and effects), for building custom editors on the viewer's data model. They are listed in the [API reference](/guide/api#codemirror-extensions). Most applications only need `createDiffViewer`.
