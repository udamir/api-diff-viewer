# api-diff-viewer

<img alt="npm" src="https://img.shields.io/npm/v/api-diff-viewer"> <img alt="npm" src="https://img.shields.io/npm/dm/api-diff-viewer?label=npm"> <img alt="npm type definitions" src="https://img.shields.io/npm/types/api-diff-viewer"> <img alt="GitHub" src="https://img.shields.io/github/license/udamir/api-diff-viewer">

CodeMirror-based diff viewer for JSON-based API documents. Supports **OpenAPI 3.0 / 3.1 / 3.2**, **AsyncAPI 2.x / 3.0**, **GraphApi** (GraphQL, 1.0), **ProtoApi** (gRPC / Protocol Buffers) and **JSON Schema** documents, compared with [api-smart-diff](https://github.com/udamir/api-smart-diff) 2.x.

[![Storybook](https://cdn.jsdelivr.net/gh/storybookjs/brand@master/badge/badge-storybook.svg)](https://api-diff-viewer.vercel.app/)

## Features

- **Side-by-side & inline views** — dual-editor or unified diff display
- **YAML & JSON output** — render diffs in either format
- **Word-level diff highlighting** — word or character granularity, or disable entirely
- **Change classification** — breaking, risky, non-breaking, deprecated, annotation, unclassified with color-coded gutter indicators
- **Change filtering** — show only specific classification types
- **Code folding** — collapse/expand API structure blocks with change count badges
- **Array-level diffs** — per-item change tracking for parameters, enum values, tags, etc.
- **Dark mode** — built-in light and dark themes with CSS variable overrides
- **WebWorker support** — non-blocking merge computation for large specs
- **Event system** — lifecycle events for loading, ready (with comparison problems), errors (e.g. unsupported documents), and state changes
- **Zero framework dependency** — pure DOM + CodeMirror, works with any framework or vanilla JS

## Installation

```sh
npm install api-diff-viewer
```

### Compatibility

| api-diff-viewer | api-smart-diff | Documents |
| --- | --- | --- |
| 2.x | 2.x (bundled) | OpenAPI 3.0 / 3.1 / 3.2, AsyncAPI 2.x / 3.0, GraphApi 1.0, ProtoApi, JSON Schema |
| 1.x | 1.x (bundled) | OpenAPI 3.0, AsyncAPI 2.x, GraphApi 0.1.x, JSON Schema |

api-smart-diff is bundled into the viewer's `dist`, so you do not install it yourself; the `api-smart-diff` types used in the viewer's API (`DiffType`, `CompareOptions`, `CompareError`) are those of api-smart-diff 2.x. The bundle targets current browsers (api-smart-diff 2.x is built for ES2020: Chrome 80, Firefox 74, Safari 13.1 or later). The package declares Node.js 22 or later (`engines`), the requirement of allof-merge, a dependency of api-smart-diff 2.x; this matters for tooling and SSR builds that load the package in Node.js.

Swagger 2.0, OpenAPI 4+, AsyncAPI 1.x / 4+, unknown GraphApi versions and a pair of two different specifications are rejected: the viewer emits an `error` event with `kind: "unsupported-spec"` (see [Errors](#errors)). ProtoApi documents are the JSON documents built from `.proto` sources with [protoapi](https://github.com/udamir/protoapi); the viewer does not parse `.proto` text.

## Quick Start

```typescript
import { createDiffViewer } from 'api-diff-viewer'

const viewer = createDiffViewer(
  document.getElementById('diff')!,
  beforeSpec, // object or JSON string (parse YAML yourself, e.g. with js-yaml)
  afterSpec,
  { format: 'yaml', mode: 'side-by-side' }
)

viewer.on('ready', ({ summary }) => {
  console.log(`${summary.total} changes (${summary.breaking} breaking)`)
})

// Cleanup when done
viewer.destroy()
```

## API Reference

### `createDiffViewer(container, before, after, options?)`

Creates and returns a `DiffViewer` instance.

| Parameter   | Type                | Description                                        |
| ----------- | ------------------- | -------------------------------------------------- |
| `container` | `HTMLElement`       | DOM element to mount into                          |
| `before`    | `object \| string`  | The "before" API spec (object or JSON string)      |
| `after`     | `object \| string`  | The "after" API spec (object or JSON string)       |
| `options`   | `DiffViewerOptions` | Configuration (see below)                          |

### `DiffViewerOptions`

| Option                      | Type                         | Default          | Description                                              |
| --------------------------- | ---------------------------- | ---------------- | -------------------------------------------------------- |
| `mode`                      | `'side-by-side' \| 'inline'` | `'side-by-side'` | Display mode                                             |
| `format`                    | `'json' \| 'yaml'`           | `'yaml'`         | Output format                                            |
| `filters`                   | `DiffType[]`                 | `[]`             | Active diff type filters (empty = show all)              |
| `dark`                      | `boolean`                    | `false`          | Enable dark theme                                        |
| `theme`                     | `Extension`                  | —                | Base CodeMirror theme extension                          |
| `colors`                    | `Partial<DiffThemeColors>`   | `{}`             | Diff-specific color overrides via CSS variables          |
| `enableFolding`             | `boolean`                    | `false`          | Enable code folding for API blocks                       |
| `showClassification`        | `boolean`                    | `false`          | Show classification gutter bars and fold badges          |
| `wordDiffMode`              | `'word' \| 'char' \| 'none'` | `'word'`         | Word-level diff granularity                              |
| `wordWrap`                  | `boolean`                    | `true`           | Enable word wrapping (false adds synced horizontal scroll) |
| `extensions`                | `Extension[]`                | `[]`             | Additional CodeMirror extensions (search, active line, etc.) |
| `useWorker`                 | `boolean`                    | `true`           | Use WebWorker for merging (non-blocking)                 |
| `workerUrl`                 | `string`                     | `''`             | Custom worker URL (default: inline blob)                 |
| `mergeOptions`              | `CompareOptions`             | `{}`             | Options passed to `api-smart-diff` (see [Diff Engine](#diff-engine)) |

### `DiffViewer` Instance Methods

#### Display Controls

```typescript
viewer.setMode('inline')           // Switch between 'side-by-side' and 'inline'
viewer.getMode()                   // Returns current mode

viewer.setFormat('json')           // Switch between 'json' and 'yaml'
viewer.getFormat()                 // Returns current format

viewer.setFilters(['breaking'])    // Filter visible changes by classification
viewer.getFilters()                // Returns active filters

viewer.setTheme({ dark: true })    // Toggle dark mode
viewer.setTheme({ colors: { ... }}) // Override diff colors
viewer.isDark()                    // Returns dark mode state

viewer.setWordDiffMode('char')     // Change word diff granularity
viewer.setWordWrap(false)          // Disable word wrap (enables synced horizontal scroll)
viewer.getWordWrap()               // Returns word wrap state
viewer.setFoldingEnabled(true)     // Toggle code folding
viewer.setClassificationEnabled(true) // Toggle classification indicators
```

#### Data Updates

```typescript
viewer.update(newBefore, newAfter) // Replace specs and re-render
```

#### Fold Control

```typescript
viewer.expandAll()                 // Expand all folded blocks
viewer.collapseAll()               // Collapse all foldable blocks
viewer.togglePath('info')          // Toggle a specific path
viewer.togglePath(['paths', '/pets', 'get']) // Array form also works
```

#### Events

```typescript
viewer.on('loading', () => { /* merge started */ })

viewer.on('ready', ({ summary, errors }) => {
  console.log(`${summary.total} changes`)
  console.log(`${summary.breaking} breaking`)
  console.log(`${summary.risky} risky`)
  console.log(`${summary.nonBreaking} non-breaking`)
  console.log(`${summary.deprecated} deprecated`)
  console.log(`${summary.annotation} annotation`)
  console.log(`${summary.unclassified} unclassified`)
  // problems inside the comparison (unresolved $ref, a custom rule that threw, ...)
  for (const e of errors) console.warn(e.kind, e.path.join('/'), e.message)
})

viewer.on('error', ({ kind, message, name, cause }) => {
  // kind: 'unsupported-spec' | 'invalid-input' | 'internal'
  console.error('Compare failed:', message)
})

viewer.on('modeChange', ({ mode }) => { /* 'side-by-side' | 'inline' */ })
viewer.on('formatChange', ({ format }) => { /* 'json' | 'yaml' */ })
viewer.on('themeChange', ({ dark }) => { /* boolean */ })
viewer.on('wordWrapChange', ({ wordWrap }) => { /* boolean */ })
```

#### Advanced

```typescript
// Access underlying CodeMirror editors
const { before, after } = viewer.getEditorViews()     // side-by-side
const { unified } = viewer.getEditorViews()            // inline

// Get change summary without navigation
viewer.getChangeSummary()

// Problems api-smart-diff reported in the last comparison (also passed with `ready`)
viewer.getCompareErrors()

// Cleanup
viewer.destroy()
```

### `DiffThemeColors`

CSS variable overrides for diff colors:

```typescript
viewer.setTheme({
  colors: {
    addedBg: 'rgba(46, 160, 67, 0.15)',
    removedBg: 'rgba(248, 81, 73, 0.15)',
    modifiedBg: 'rgba(227, 179, 65, 0.15)',
    breakingColor: '#cf222e',
    riskyColor: '#bc4c00',
    nonBreakingColor: '#1a7f37',
    deprecatedColor: '#9a6700',
    annotationColor: '#8250df',
    unclassifiedColor: '#656d76',
    addedTextBg: 'rgba(46, 160, 67, 0.4)',
    removedTextBg: 'rgba(248, 81, 73, 0.4)',
    spacerBg: '#f6f8fa',
    spacerStripe: '#e1e4e8',
  }
})
```

### `ChangeSummary`

Returned by `ready` event and `getChangeSummary()`:

```typescript
interface ChangeSummary {
  total: number // the sum of the six counters
  breaking: number
  risky: number
  nonBreaking: number
  deprecated: number
  annotation: number
  unclassified: number
  byPath: Map<string, { type: DiffType; count: number }[]>
}
```

`diffTypes` (exported) lists the six types from the most to the least severe; it is also the index order of `DiffBlockData.diffs`. `diffTypeLabels` and `diffTypeCountKeys` map each type to its label and to its `ChangeSummary` / `ClassificationCounts` key.

### Errors

`createDiffViewer` and `update` never throw for documents the engine cannot compare; they emit `error` instead, and nothing new is rendered:

| `kind` | When |
| --- | --- |
| `unsupported-spec` | api-smart-diff throws `UnsupportedSpecError` (`name` is kept across the worker): Swagger 2.0, OpenAPI 4+, AsyncAPI 1.x / 4+, an unknown GraphApi version, or two different specifications. Convert Swagger 2.0 to OpenAPI 3 first, or pass `mergeOptions: { engine: 'jsonschema' }` to compare the documents as plain JSON |
| `invalid-input` | a string input is not valid JSON |
| `internal` | anything else (worker failure, ...) |

Problems inside a comparison that still completed (an unresolved `$ref`, a custom rule or annotate hook that threw) are passed as `errors` with `ready` and returned by `getCompareErrors()`. Set `mergeOptions.onError` to receive them yourself instead (the comparison then runs on the main thread, since functions cannot be posted to a worker).

### Diff Engine

The diff logic is powered by [api-smart-diff](https://github.com/udamir/api-smart-diff) 2.x, which performs structural merging and semantic comparison of API specifications. It understands the semantics of OpenAPI, AsyncAPI, GraphApi, ProtoApi and JSON Schema documents — so changes are classified not just as text edits but by their impact on API consumers.

The merge pipeline:

1. **Structural merge** — `apiCompare(before, after).merged` walks both specs in parallel, producing a single merged document annotated with `$diff` metadata on every changed node. Each `$diff` entry carries an `action` (add, remove, replace, rename) and a `type` (breaking, risky, non-breaking, deprecated, annotation, unclassified). The merged document holds the original input values: the after side for kept and added nodes, the before side for removed ones; objects and arrays follow the after order with removed keys and items at the end of their container; an unchanged `$ref` stays a `$ref`, a `$ref` whose target changed is shown inlined at the usage. A renamed key (a path template, a component, a channel) is one `rename` change: the before editor shows the old key, the after editor the new one.
2. **Diff tree construction** — the merged document is converted into a `DiffBlockData` tree by the diff builder, which generates format-specific tokens (JSON or YAML syntax) for rendering.
3. **Content alignment** — for side-by-side mode, spacer lines are inserted so corresponding sections align visually across both editors.

You can pass options through to `api-smart-diff` via the `mergeOptions` field:

```typescript
createDiffViewer(container, before, after, {
  mergeOptions: {
    // Custom comparison rules
    rules: { ... },
    // Custom description hook
    annotateHook: (diff, ctx) => { ... },
    // Resolved external $ref sources
    externalSources: {
      before: { 'common.yaml': { ... } },
      after: { 'common.yaml': { ... } },
    },
  },
})
```

The `mergeOptions` field accepts `api-smart-diff` options. Available parameters:

| Option             | Type                                              | Description                              |
| ------------------ | ------------------------------------------------- | ---------------------------------------- |
| `merged`           | `'original' \| 'normalized'`                      | `'original'` (default): show the documents as written; `'normalized'`: show the values the engine compared (path-level parameters moved into operations, merged `allOf`, ...), as the 1.x viewer did |
| `engine`           | `'openapi' \| 'asyncapi' \| 'graphapi' \| 'protoapi' \| 'jsonschema'` | Force an engine instead of detecting it (e.g. `'jsonschema'` for documents that would be rejected) |
| `components`       | `'usage' \| 'unclassified'`                       | How changes inside shared components are classified |
| `externalSources`  | `{ before?: Record<string, unknown>; after?: Record<string, unknown> }` | Resolved external `$ref` sources |
| `rules`, `extensions` | `CompareRules`, `CompareExtensionRules`        | Custom comparison rules (run on the main thread) |
| `annotateHook`     | `AnnotateHook`                                    | Custom hook for change descriptions (run on the main thread) |
| `onError`          | `(error: CompareError) => void`                   | Receive comparison problems yourself (run on the main thread) |

See the [api-smart-diff options](https://udamir.github.io/api-smart-diff/) for the full list.

> **Note:** `metaKey` and `arrayMeta` are managed internally and cannot be overridden. Options holding functions cannot be posted to a WebWorker, so a comparison with `rules`, `extensions`, `annotateHook` or `onError` runs on the main thread.

### Change Classification Types

| Type           | Description                          | Examples                                                                        |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `breaking`     | Changes that break existing clients  | Removing endpoints/parameters, changing types, adding required fields           |
| `risky`        | Valid for most clients, but can break some | An enum value added to a response, a looser bound on a response value, a new argument with a default |
| `non-breaking` | Backwards-compatible changes         | Adding optional parameters/properties, relaxing request constraints, adding enum values to a request |
| `deprecated`   | Something was deprecated             | `deprecated: true` on an operation or parameter, a GraphQL `@deprecated` field |
| `annotation`   | Documentation-only changes           | Description, summary, example, `x-*` extension changes                         |
| `unclassified` | Changes without clear classification | Changes in a component that nothing references                                  |

## Usage Examples

### Basic Side-by-Side

```typescript
import { createDiffViewer } from 'api-diff-viewer'

const viewer = createDiffViewer(
  document.getElementById('diff')!,
  openApiV1,
  openApiV2,
)
```

### Inline Mode with Folding

```typescript
const viewer = createDiffViewer(container, before, after, {
  mode: 'inline',
  enableFolding: true,
  showClassification: true,
})
```

### Dark Mode with Custom Colors

```typescript
const viewer = createDiffViewer(container, before, after, {
  dark: true,
  colors: {
    breakingColor: '#ff6b6b',
    nonBreakingColor: '#51cf66',
  },
})
```

### Filtering Breaking Changes

```typescript
const viewer = createDiffViewer(container, before, after, {
  filters: ['breaking'],
  enableFolding: true,
  showClassification: true,
})
```

### CodeMirror Extensions

```typescript
import { createDiffViewer } from 'api-diff-viewer'
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { highlightActiveLine, keymap } from '@codemirror/view'

const viewer = createDiffViewer(container, before, after, {
  extensions: [
    search(),
    keymap.of(searchKeymap),
    highlightActiveLine(),
    highlightSelectionMatches(),
  ],
})
// Ctrl+F / Cmd+F opens search in each panel
```

> **Note:** The library does not bundle `@codemirror/search` — install it separately:
> `npm install @codemirror/search`

### Synchronous Mode (No Worker)

```typescript
const viewer = createDiffViewer(container, before, after, {
  useWorker: false,
})
// Ready immediately after construction (no 'loading' event)
```

### Runtime Option Changes

```typescript
const viewer = createDiffViewer(container, before, after)

// Toggle mode
document.getElementById('toggle-mode')!.onclick = () => {
  viewer.setMode(viewer.getMode() === 'side-by-side' ? 'inline' : 'side-by-side')
}

// Toggle format
document.getElementById('toggle-format')!.onclick = () => {
  viewer.setFormat(viewer.getFormat() === 'yaml' ? 'json' : 'yaml')
}

// Toggle dark mode
document.getElementById('toggle-dark')!.onclick = () => {
  viewer.setTheme({ dark: !viewer.isDark() })
}
```

### Updating Specs

```typescript
const viewer = createDiffViewer(container, specV1, specV2)

// Later, compare different versions
viewer.update(specV2, specV3)
```

## Migrating from 1.x

api-diff-viewer 2.0 uses api-smart-diff 2.x. What changes for viewer users:

- **Two more classifications.** `risky` (new in api-smart-diff 2.0) and `deprecated` (already produced by 1.x but dropped by the viewer) are now counted, coloured, filterable and navigable. `ChangeSummary` has `risky` and `deprecated` counters and `total` is now exactly the sum of the six; `DiffThemeColors` has `riskyColor` and `deprecatedColor` (CSS variables `--diff-risky-color`, `--diff-deprecated-color`, plus `--diff-badge-risky-*` / `--diff-badge-deprecated-*`); add `'risky'` / `'deprecated'` to any filter list or legend you build. Gutter bars, fold badges and change badges use the classes `cm-diff-type-risky`, `cm-diff-fold-badge-risky`, `cm-change-badge-risky` (and `-deprecated`).
- **Breaking type changes.** `ChildKeyInfo.changeCounts` (from `navigation.getChildKeys()`) is a `ClassificationCounts` object (`{ breaking, risky, nonBreaking, deprecated, annotation, unclassified }`) instead of a four-number tuple. `DiffBlockData.diffs` has six entries in the order of `diffTypes` (`breaking, risky, non-breaking, deprecated, annotation, unclassified`), so `annotation` moved from index 2 to 4 and `unclassified` from 3 to 5. `BadgeData` and `ClassificationCounts` gained `risky` / `deprecated`, and `ChangeBadgeWidget` takes `(counts, blockId)`. `mergeOptions` is api-smart-diff 2.x `CompareOptions` (the misspelled `ComapreOptions` type no longer exists; `annotateHook` is `(diff, ctx) => string`).
- **Events.** `ready` also passes `errors` (comparison problems, see [Errors](#errors)); `error` passes `kind` (and `name`). Unsupported documents (Swagger 2.0, ...) are reported with `error` instead of being diffed as plain JSON, and the constructor no longer throws when `useWorker: false`.
- **String inputs must be JSON.** A YAML string used to be compared as a plain string; it is now an `invalid-input` error. Parse YAML yourself and pass the object.
- **Rendered content.** The viewer shows the documents as written (api-smart-diff `merged: "original"`): path-level parameters stay on the path item, unchanged `$ref`s stay `$ref`s, `allOf` is not merged, and removed keys and array items are shown at the end of their container, after the after-side entries. Navigation paths (`goToPath`, `findPaths`, `getChildKeys`, `togglePath`) follow that document, so a path that only existed in the 1.x normalized document (e.g. a path-level parameter under `.../get/parameters/N`) no longer resolves. Pass `mergeOptions: { merged: 'normalized' }` to get the 1.x-style content.
- **Different classifications and counts.** api-smart-diff 2.x classifies changes inside components by their usages, reports a changed component at the declaration and at each usage, produces `rename` changes for renamed paths, components, channels and messages, and rewrote its rules, so the counts of the same documents differ from 1.x. An array container no longer borrows the change of its first changed item, so the summary counts each item change instead of the container.
- **Bundle size.** api-smart-diff 2.x (with its OpenAPI 3.2, AsyncAPI 3.0, GraphApi 1.0 and ProtoApi engines) makes the ES bundle about 470 kB larger (about 125 kB gzipped).

## Development

Requires Node.js 22.18 or later (Vite+ and Vitest 5 need `^22.18.0 || ^24.11.0 || >=26.0.0`) and pnpm 10 (the version is pinned in `packageManager`; `corepack enable` picks it up). The toolchain is [Vite+](https://viteplus.dev) (`vp`): Vite and Rolldown for the demo, tsdown (`vp pack`) for the library build, Vitest 5 for the tests, Oxlint and Oxfmt plus the TypeScript 7 type check for `vp check`.

```sh
pnpm install            # install dependencies
pnpm run build          # library build (vp pack): dist/api-diff-viewer.es.js, .umd.js, .css, index.d.ts
pnpm run dev            # demo page with live reload (vp dev)
pnpm run build-demo     # demo build to demo-dist/
pnpm run test           # all Vitest projects: unit tests and the Storybook tests in Chromium
pnpm run test --project unit   # unit tests only
pnpm run test:watch     # watch mode
pnpm run test-storybook # Storybook play functions in Chromium (`pnpm exec playwright install chromium` once)
pnpm run check          # format, lint and type check (vp check); `pnpm run check:fix` applies the fixes
pnpm run typecheck      # TypeScript 7 (tsc --noEmit)
pnpm run storybook      # Storybook on port 6006
```

## License

MIT
