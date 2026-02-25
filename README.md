# api-diff-viewer

<img alt="npm" src="https://img.shields.io/npm/v/api-diff-viewer"> <img alt="npm" src="https://img.shields.io/npm/dm/api-diff-viewer?label=npm"> <img alt="npm type definitions" src="https://img.shields.io/npm/types/api-diff-viewer"> <img alt="GitHub" src="https://img.shields.io/github/license/udamir/api-diff-viewer">

CodeMirror-based diff viewer for JSON-based API documents. Supports **OpenAPI 3.x**, **AsyncAPI 2.x**, and **JsonSchema** specifications.

[![Storybook](https://cdn.jsdelivr.net/gh/storybookjs/brand@master/badge/badge-storybook.svg)](https://api-diff-viewer.vercel.app/)

## Features

- **Side-by-side & inline views** — dual-editor or unified diff display
- **YAML & JSON output** — render diffs in either format
- **Word-level diff highlighting** — word or character granularity, or disable entirely
- **Change classification** — breaking, non-breaking, annotation, unclassified with color-coded gutter indicators
- **Change filtering** — show only specific classification types
- **Code folding** — collapse/expand API structure blocks with change count badges
- **Array-level diffs** — per-item change tracking for parameters, enum values, tags, etc.
- **Dark mode** — built-in light and dark themes with CSS variable overrides
- **WebWorker support** — non-blocking merge computation for large specs
- **Event system** — lifecycle events for loading, ready, errors, and state changes
- **Zero framework dependency** — pure DOM + CodeMirror, works with any framework or vanilla JS

## Installation

```sh
npm install api-diff-viewer
```

## Quick Start

```typescript
import { createDiffViewer } from 'api-diff-viewer'
import 'api-diff-viewer/style.css'

const viewer = createDiffViewer(
  document.getElementById('diff')!,
  beforeSpec, // object or JSON/YAML string
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
| `before`    | `object \| string`  | The "before" API spec (object or JSON/YAML string) |
| `after`     | `object \| string`  | The "after" API spec (object or JSON/YAML string)  |
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
| `mergeOptions`              | `CompareOptions`             | `{}`             | Override options passed to `api-smart-diff`              |

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

viewer.on('ready', ({ summary }) => {
  console.log(`${summary.total} changes`)
  console.log(`${summary.breaking} breaking`)
  console.log(`${summary.nonBreaking} non-breaking`)
  console.log(`${summary.annotation} annotation`)
  console.log(`${summary.unclassified} unclassified`)
})

viewer.on('error', ({ message, cause }) => {
  console.error('Merge failed:', message)
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
    nonBreakingColor: '#1a7f37',
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
  total: number
  breaking: number
  nonBreaking: number
  annotation: number
  unclassified: number
  byPath: Map<string, { type: DiffType; count: number }[]>
}
```

### Diff Engine

The diff logic is powered by [api-smart-diff](https://github.com/udamir/api-smart-diff), which performs structural merging and semantic comparison of API specifications. It understands the semantics of OpenAPI, AsyncAPI, and JsonSchema documents — so changes are classified not just as text edits but by their impact on API consumers.

The merge pipeline:

1. **Structural merge** — `api-smart-diff` walks both specs in parallel, producing a single merged document annotated with `$diff` metadata on every changed node. Each `$diff` entry carries an `action` (add, remove, replace, rename) and a `type` (breaking, non-breaking, annotation, unclassified).
2. **Diff tree construction** — the merged document is converted into a `DiffBlockData` tree by the diff builder, which generates format-specific tokens (JSON or YAML syntax) for rendering.
3. **Content alignment** — for side-by-side mode, spacer lines are inserted so corresponding sections align visually across both editors.

You can pass options through to `api-smart-diff` via the `mergeOptions` field:

```typescript
createDiffViewer(container, before, after, {
  mergeOptions: {
    // Custom comparison rules
    rules: { ... },
    // Custom annotation hook
    annotateHook: (before, after, ctx) => { ... },
    // Resolved external $ref sources
    externalSources: {
      before: { 'common.yaml': { ... } },
      after: { 'common.yaml': { ... } },
    },
  },
})
```

The `mergeOptions` field accepts `api-smart-diff` options. Available parameters:

| Option            | Type                                              | Description                              |
| ----------------- | ------------------------------------------------- | ---------------------------------------- |
| `rules`           | `CompareRules`                                    | Custom comparison rules                  |
| `annotateHook`    | `AnnotateHook`                                    | Custom hook for change annotations       |
| `externalSources` | `{ before?: Record<string, unknown>; after?: Record<string, unknown> }` | Resolved external `$ref` sources |

> **Note:** `metaKey` and `arrayMeta` are managed internally and cannot be overridden.

### Change Classification Types

| Type           | Description                          | Examples                                                                        |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `breaking`     | Changes that break existing clients  | Removing endpoints/parameters, changing types, adding required fields           |
| `non-breaking` | Backwards-compatible changes         | Adding optional parameters/properties, relaxing constraints, adding enum values |
| `annotation`   | Documentation-only changes           | Description, summary, example changes                                           |
| `unclassified` | Changes without clear classification | Extension field (`x-*`) changes                                                 |

## Usage Examples

### Basic Side-by-Side

```typescript
import { createDiffViewer } from 'api-diff-viewer'
import 'api-diff-viewer/style.css'

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
import 'api-diff-viewer/style.css'

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

## Development

```sh
pnpm install          # Install dependencies
pnpm run build        # Type-check + build library
pnpm run storybook    # Run Storybook on port 6006
pnpm run test         # Run tests
pnpm run lint         # Lint with Biome
```

## License

MIT
