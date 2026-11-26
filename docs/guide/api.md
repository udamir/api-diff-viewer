# API reference

Every public export of the package entry (`api-diff-viewer`, `src/index.ts`). Most applications only need [`createDiffViewer`](#main-api) and the types of its options and events; the other exports are the building blocks of the viewer (diff model, content generation, CodeMirror extensions) for custom editors.

The unit test `tests/docs/api-reference.test.ts` fails when an export is missing from this page or when this page lists a name that is not exported.

## Main API

| Export | Kind | Description |
| --- | --- | --- |
| `createDiffViewer` | function | `createDiffViewer(container, before, after, options?)`: creates a `DiffViewer` and renders the comparison into `container`. See [Usage](/guide/usage) |
| `DiffViewer` | class | The viewer: display setters and getters, `update`, folding, `navigation`, `getEditorViews`, `getChangeSummary`, `getCompareErrors`, `destroy`, and the `on` / `off` events. `new DiffViewer(...)` takes the same arguments as `createDiffViewer` |
| `DiffViewerOptions` | interface | The options of `createDiffViewer`, see [Options](/guide/options) |
| `DiffViewerEvents` | type | Event names and payloads: `loading`, `ready`, `error`, `navigate`, `modeChange`, `formatChange`, `themeChange`, `wordWrapChange`, see [Events](/guide/events) |
| `DiffViewerError` | interface | Payload of the `error` event: `message`, `kind`, `name`, `cause` |
| `DiffViewerErrorKind` | type | `"unsupported-spec" \| "invalid-input" \| "internal"` |

### DiffViewer methods

| Method | Description |
| --- | --- |
| `setMode(mode)` / `getMode()` | `"side-by-side"` or `"inline"` |
| `setFormat(format)` / `getFormat()` | `"yaml"` or `"json"` |
| `setFilters(types)` / `getFilters()` | Change types to show (`[]`: all) |
| `setTheme({ dark?, theme?, colors? })` / `isDark()` | Theme switch and colour overrides |
| `setWordDiffMode(mode)` / `getWordDiffMode()` | `"word"`, `"char"` or `"none"` |
| `setWordWrap(enabled)` / `getWordWrap()` | Line wrapping |
| `setFoldingEnabled(enabled)` / `getFoldingEnabled()` | Fold gutter |
| `setClassificationEnabled(enabled)` / `getClassificationEnabled()` | Change type indicators |
| `update(before, after)` | Compare new documents |
| `expandAll()` / `collapseAll()` / `togglePath(path)` | Folding |
| `navigation` (getter) | The [Navigation API](/guide/navigation) of the current editors |
| `getEditorViews()` | `{ before, after }` (side-by-side) or `{ unified }` (inline) CodeMirror `EditorView`s |
| `getChangeSummary()` | The `ChangeSummary` of the last comparison |
| `getCompareErrors()` | The comparison problems of the last comparison |
| `on(event, handler)` / `off(event, handler)` | Subscribe (returns an unsubscribe function) / unsubscribe |
| `destroy()` | Remove the editors, the worker and the listeners |

## Change types

| Export | Kind | Description |
| --- | --- | --- |
| `diffTypes` | const | The six change types from the most to the least severe; also the index order of `DiffBlockData.diffs` |
| `diffTypeLabels` | const | Human-readable label of each change type (`"Non-breaking"`, ...) |
| `diffTypeCountKeys` | const | Key of each change type in `ClassificationCounts` / `ChangeSummary` (`"non-breaking"` → `"nonBreaking"`) |
| `ClassificationCounts` | interface | One counter per change type: `breaking`, `risky`, `nonBreaking`, `deprecated`, `annotation`, `unclassified` |
| `ChangeSummary` | interface | `ClassificationCounts` plus `total` (their sum) and `byPath` (`Map<path, { type, count }[]>`) |

## Themes

| Export | Kind | Description |
| --- | --- | --- |
| `diffTheme` | function | `diffTheme({ dark?, colors? })`: the diff theme extension (CSS variables, editor colours, syntax highlighting) |
| `diffThemeLight` | const | The light editor theme (fonts, gutters, active line, light colour variables) |
| `diffThemeDark` | const | The dark editor theme |
| `lightColors` | const | Default light `DiffThemeColors` |
| `darkColors` | const | Default dark `DiffThemeColors` |
| `DiffThemeManager` | class | Holds the diff theme in a compartment: `getExtensions(baseTheme?, colors?, dark?)` and `setDiffTheme(view, { dark, colors })` for runtime switching |
| `DiffThemeColors` | interface | The colour keys of the diff theme, see [Theming](/guide/theming#colour-overrides) |

## Navigation

| Export | Kind | Description |
| --- | --- | --- |
| `createNavigationAPI` | function | `createNavigationAPI(beforeView, afterView, diffData, merged?)`: a `NavigationAPI` for editors you build yourself |
| `NavigationAPI` | interface | `goToNextChange`, `goToPrevChange`, `goToPath`, `findPaths`, `getChildKeys`, `getChangeSummary`, `getCurrentPath`, `onNavigate`, see [Navigation API](/guide/navigation) |
| `NavigationOptions` | interface | `behavior`, `align`, `highlight` of `goToPath` |
| `FindPathsOptions` | interface | `caseSensitive`, `searchIn`, `limit` of `findPaths` |
| `PathSearchResult` | interface | A `findPaths` match: `path`, `matchedText`, `matchLocation`, `diffType` |
| `ChildKeyInfo` | interface | A `getChildKeys` entry: `key`, `path`, `hasDirectChange`, `diffType`, `action`, `hasChildren`, `changeCounts` |

## Path utilities

| Export | Kind | Description |
| --- | --- | --- |
| `DiffPath` | type | A path: `string` (keys joined with `/`, JSON Pointer escaping) or `string[]` |
| `parsePath` | function | `DiffPath` → array of decoded keys |
| `formatPath` | function | Array of keys → encoded path string |
| `encodeSegment` | function | Escape one key (`~` → `~0`, `/` → `~1`) |
| `decodeSegment` | function | Unescape one key |
| `resolvePathToBlock` | function | `resolvePathToBlock(path, blocks)`: the `DiffBlockData` of a path, or `null` |
| `getAncestorBlockIds` | function | `getAncestorBlockIds(path, blocks)`: the ids of the existing ancestor blocks of a path, from the root |

## Events and worker

| Export | Kind | Description |
| --- | --- | --- |
| `TypedEventEmitter` | class | The typed event emitter `DiffViewer` extends: `on`, `off`, `removeAllListeners` |
| `DiffWorkerManager` | class | `new DiffWorkerManager(workerUrl?)`: runs comparisons in a module worker, with the main-thread fallbacks described in [Web Worker](/guide/worker); `compare(before, after, options)`, `merge(...)`, `destroy()` |

## Data model

| Export | Kind | Description |
| --- | --- | --- |
| `MergedDocument` | type | The merged document of api-smart-diff: `MergedObject \| MergedArray` |
| `MergedObject` | type | An object of the merged document, with the change metadata of its keys under `$diff` |
| `MergedArray` | type | An array of the merged document |
| `JsonValue` | type | Any JSON value (plus `Date`, for YAML timestamps) |
| `JsonObject` | type | A JSON object |
| `JsonArray` | type | A JSON array |
| `JsonPrimitive` | type | `string \| number \| boolean \| null` |
| `DiffData` | interface | The rendered diff: `blocks` (the `DiffBlockData` tree), `lineMap`, `blockMap` |
| `LineMapping` | interface | Mapping of an editor line to its before / after lines, change kind, block id and change type |
| `BlockMapping` | interface | Before / after line ranges of a block |
| `DiffDecoration` | interface | A decorated range with its change type, action and side |
| `WordDiff` | interface | A word-level change range (`from`, `to`, `added` / `removed`) |
| `AlignedContent` | interface | Aligned before / after texts with their line map |
| `SyncState` | interface | State shared by two synchronised editors (line map, folded blocks, selection) |
| `DiffConfig` | interface | Configuration of the editor diff state (`diffConfigFacet`) |
| `defaultDiffConfig` | const | Default `DiffConfig` |

## Diff builder

| Export | Kind | Description |
| --- | --- | --- |
| `buildDiffBlock` | function | `buildDiffBlock(merged, format?, { skipWordDiff? })`: converts a merged document into the root `DiffBlockData` with YAML or JSON tokens |
| `valueTokens` | function | Tokens of a value with word-level diff support (used by the format strategies) |
| `FormatContext` | interface | Traversal context of a format strategy (`last`, `level`, `skipWordDiff`) |
| `FormatStrategy` | interface | Token generation for one output format (YAML or JSON) |
| `DiffBlockData` | class | A line with children: a block of the document with its id (path), tokens, change metadata and per-type change counters (`diffs`, in the order of `diffTypes`) |
| `DiffLineData` | class | A rendered line: index, indent, tokens and change metadata |
| `Token` | class | A token of a line (key, index, value, punctuation) with its tags (`before`, `after`, ...) |
| `LineDiff` | type | Change metadata of a line |
| `TokenTag` | type | `"before" \| "after" \| "empty" \| "collapsed" \| "expanded"` |
| `TokenType` | type | `"key" \| "index" \| "value" \| "spec"` or a change type |

## Content generation and sync

| Export | Kind | Description |
| --- | --- | --- |
| `generateAlignedContentFromDiff` | function | `(blocks, format, { wordDiffMode? })`: before and after lines with spacer lines, the line map and the block line ranges (side-by-side) |
| `generateUnifiedContentFromDiff` | function | `(blocks, format, { inlineWordDiff? })`: the lines of the unified (inline) view and their line map |
| `tokensToStringBatch` | function | `(lines, side, extraIndent?)`: the text of block lines for one side |
| `SPACER_LINE` | const | The content of a spacer line |
| `AlignmentResult` | interface | Result of `generateAlignedContentFromDiff` |
| `UnifiedResult` | interface | Result of `generateUnifiedContentFromDiff` |
| `UnifiedContentOptions` | interface | Options of `generateUnifiedContentFromDiff` |
| `setupHeightSync` | function | `setupHeightSync(beforeView, afterView)`: keeps wrapped lines of two editors at equal heights |
| `HeightSyncHandle` | interface | Handle of `setupHeightSync`: re-equalize and destroy |
| `setupFoldSync` | function | `setupFoldSync(beforeView, afterView, lineMap)`: folds and unfolds the same blocks in both editors; returns a cleanup function |
| `foldAllInView` | function | Fold every foldable range of an editor |
| `unfoldAllInView` | function | Unfold every folded range of an editor |

## Editor state

| Export | Kind | Description |
| --- | --- | --- |
| `diffStateField` | const | CodeMirror state field with the diff data, selection, expanded blocks, filters, mode and format of an editor |
| `diffConfigFacet` | const | Facet with the `DiffConfig` of an editor |
| `getDiffState` | function | The `DiffEditorState` of an editor state |
| `getDiffConfig` | function | The `DiffConfig` of an editor state |
| `DiffEditorState` | interface | Value of `diffStateField` |
| `setDiffDataEffect` | const | State effect: set the `DiffData` |
| `setSelectedBlockEffect` | const | State effect: select a block (or `null`) |
| `toggleBlockExpandedEffect` | const | State effect: toggle a block by id |
| `setExpandedBlocksEffect` | const | State effect: set the expanded block ids |
| `setFiltersEffect` | const | State effect: set the change type filters |
| `setDisplayModeEffect` | const | State effect: set the display mode |
| `setFormatEffect` | const | State effect: set the format |

## CodeMirror extensions

The extensions the views are built from. See [CodeMirror extensions](/guide/extensions) for adding your own.

### Aligned decorations

| Export | Kind | Description |
| --- | --- | --- |
| `alignedDecorations` | function | Line decorations (added, removed, modified, spacer) driven by the line map |
| `alignedDecorationsPlugin` | const | The view plugin of `alignedDecorations` |
| `alignedDecorationsTheme` | const | Styles of the aligned decorations |
| `buildAlignedDecorations` | function | Build the decoration set of an editor from its line map |
| `isSpacerLine` | function | Whether an editor line is a spacer line |
| `lineMappingsField` | const | State field with the line map of an editor |
| `setLineMappingsEffect` | const | State effect: set the line map |
| `setEditorSideEffect` | const | State effect: set the side (`before`, `after`, `unified`) |
| `setWordDiffModeEffect` | const | State effect: set the word diff mode |
| `LINE_HEIGHT_PX` | const | Line height used by the decorations, in pixels |

### Change badges

| Export | Kind | Description |
| --- | --- | --- |
| `changeBadges` | function | Badges with the change counts of a block, next to its key |
| `changeBadgesTheme` | const | Styles of the change badges |
| `ChangeBadgeWidget` | class | The badge widget, `new ChangeBadgeWidget(counts, blockId)` |
| `BadgeData` | interface | Counters of a badge plus its position |
| `badgeDataField` | const | State field with the badges of an editor |
| `setBadgeDataEffect` | const | State effect: set the badges |
| `buildBadgeData` | function | Build the badges from the diff data and the line map |

### Diff decorations

| Export | Kind | Description |
| --- | --- | --- |
| `diffDecorations` | function | Block decorations from the diff state |
| `diffDecorationsPlugin` | const | The view plugin of `diffDecorations` |
| `diffDecorationsTheme` | const | Styles of the diff decorations (including the selected block) |
| `buildDecorations` | function | Build the decoration set of an editor |

### Folding

| Export | Kind | Description |
| --- | --- | --- |
| `diffFolding` | function | Fold styling (theme only) |
| `diffFoldingTheme` | const | Styles of the fold gutter and the fold placeholder badges |
| `diffFoldKeymap` | const | Key bindings for folding |
| `createFoldPlaceholder` | function | The DOM element of a fold placeholder with change counters per type |
| `prepareFoldPlaceholder` | function | Count the changes of a folded range for its placeholder (skips spacer lines) |
| `FoldPlaceholderData` | interface | Result of `prepareFoldPlaceholder` |

### Gutters

| Export | Kind | Description |
| --- | --- | --- |
| `diffGutter` | function | The diff gutter extension |
| `diffGutterTheme` | const | Styles of the diff gutter, including the change type bars (`cm-diff-type-<type>`) |
| `DiffGutterMarker` | class | A gutter marker with the change kind and type of a line |
| `buildGutterMarkers` | function | Build the gutter markers of an editor |
| `createClassificationGutter` | function | `(lineMap, side)`: the coloured change type bar gutter |
| `createDiffMarkerGutter` | function | The added / removed / modified marker gutter (placed after the fold gutter) |
| `diffMarkerGutterTheme` | const | Styles of the marker gutter |
| `GutterChangeType` | type | `"added" \| "removed" \| "modified" \| "unchanged" \| "spacer"` |
| `createSpacerAwareLineNumbers` | function | Line numbers that skip spacer lines and number each side by its own document |

### Word diff

| Export | Kind | Description |
| --- | --- | --- |
| `computeWordDiff` | function | Word or character diff of two lines |
| `buildWordDiffData` | function | Word diff data of the modified lines of an editor (optionally for a line range) |
| `buildWordDiffDataFromContent` | function | Word diff data from before / after line contents |
| `buildInlineWordDiffData` | function | Word diff data for the inline view |
| `wordDiffDataField` | const | State field with the word diff data of an editor |
| `setWordDiffDataEffect` | const | State effect: replace the word diff data |
| `extendWordDiffDataEffect` | const | State effect: append word diff data |
| `wordDiffTheme` | const | Styles of the word highlights |
| `wordDiffStateField` | function | Only the word diff state field (survives compartment reconfiguration) |
| `wordDiffPluginOnly` | function | Only the word diff plugin and theme (for a compartment) |
| `WordDiffData` | interface | Word diff ranges of a line |
| `WordDiffRange` | interface | A changed range inside a line |
| `diffWords` | function | Word diff of two strings (re-exported from `diff`) |
| `diffChars` | function | Character diff of two strings (re-exported from `diff`) |

### Inline word diff

| Export | Kind | Description |
| --- | --- | --- |
| `inlineWordDiff` | function | Inline view: show a modified line once, with the removed words as widgets |
| `inlineWordDiffTheme` | const | Styles of the inline word diff |
| `inlineWordDiffField` | const | State field with the inline word diff lines |
| `setInlineWordDiffEffect` | const | State effect: set the inline word diff lines |
| `inlineWordDiffConfigField` | const | State field with the inline word diff configuration |
| `setInlineWordDiffConfigEffect` | const | State effect: set the inline word diff configuration |
| `buildInlineWordDiffLines` | function | Build the inline word diff lines from the unified content |
| `RemovedTextWidget` | class | Widget that shows removed text inside a line |
| `InlineWordDiffLine` | interface | Inline word diff data of a line |
| `InlineWordDiffConfig` | interface | Configuration of the inline word diff |
