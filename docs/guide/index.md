# Introduction

api-diff-viewer renders the difference between two versions of an API document in the browser. You give it a DOM element and the *before* and *after* documents; it compares them with [api-smart-diff](https://udamir.github.io/api-smart-diff/) 2.x and shows the result in [CodeMirror 6](https://codemirror.net/) editors, either side by side or as one inline (unified) view, with every change coloured by its type.

The library is framework-free: it is plain DOM plus CodeMirror, so it works the same in a plain page and inside React, Vue, Svelte or Angular components (you create the viewer when the element is mounted and call `destroy()` when it is removed).

## Supported documents

| Specification | Versions | Detected by |
| --- | --- | --- |
| OpenAPI | 3.0, 3.1, 3.2 | `openapi: 3.x` |
| AsyncAPI | 2.x, 3.0 | `asyncapi: 2.x` / `3.0.x` |
| GraphQL | GraphApi 1.0 (the JSON encoding of a GraphQL schema built by [gqlapi](https://github.com/udamir/gqlapi)) | `graphapi: "1.0"` |
| gRPC / Protocol Buffers | ProtoApi (the JSON document built from `.proto` sources by [protoapi](https://github.com/udamir/protoapi)) | `protoapi: "0.1"` |
| JSON Schema | draft-04 to 2020-12, or any other JSON document | everything else |

The viewer compares parsed documents. It does not parse YAML, GraphQL SDL or `.proto` text itself: parse YAML with a library such as js-yaml, and build GraphApi or ProtoApi documents with gqlapi or protoapi first. Swagger 2.0, OpenAPI 4+, AsyncAPI 1.x / 4+, unknown GraphApi versions and a pair of two different specifications are rejected with an [`error` event](/guide/events#errors).

## What you see

- **The merged document.** api-smart-diff merges both documents into one, annotated with change metadata. The before editor shows the document as it was and the after editor as it is now; spacer lines keep the two sides aligned. In inline mode one editor shows both, with removed and added lines interleaved.
- **Change types.** Each change is [breaking, risky, non-breaking, deprecated, annotation or unclassified](/guide/change-types). With `showClassification` the gutter shows a coloured bar per changed line and folded blocks show a counter per type.
- **Word diff.** A changed value highlights the changed words (or characters) only.
- **Folding and filters.** With `enableFolding` every object and array can be folded; `filters` folds everything that does not contain a change of the chosen types.

## How it works

1. `apiCompare(before, after).merged` from api-smart-diff 2.x produces the merged document with a `$diff` entry on every changed node (action and change type).
2. The diff builder turns the merged document into a tree of blocks with YAML or JSON tokens.
3. The views generate the editor contents (aligned before and after text, or the unified text) and attach decorations, gutters, fold badges and word diffs as CodeMirror extensions.

## Next steps

- [Install](/guide/installation) the package and [render a first diff](/guide/getting-started).
- Read the [options](/guide/options) and the [runtime methods](/guide/usage).
- Browse the [API reference](/guide/api) for every export of the package.
