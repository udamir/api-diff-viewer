# Events and errors

`DiffViewer` is a typed event emitter. `on(event, handler)` subscribes and returns an unsubscribe function; `off(event, handler)` removes a handler. Handlers that throw are caught and logged, so they cannot break the viewer.

```ts
const unsubscribe = viewer.on("ready", ({ summary, errors }) => {
  console.log(`${summary.total} changes`);
});

unsubscribe();
```

## Events

| Event | Payload | When |
| --- | --- | --- |
| `loading` | `undefined` | `update()` started a comparison |
| `ready` | `{ summary: ChangeSummary; errors: CompareError[] }` | A comparison finished and the diff is rendered |
| `error` | `DiffViewerError` | The documents could not be compared; nothing new is rendered |
| `navigate` | `{ path: string \| null }` | The current path of the [navigation](/guide/navigation) changed |
| `modeChange` | `{ mode: "side-by-side" \| "inline" }` | `setMode` changed the mode |
| `formatChange` | `{ format: "json" \| "yaml" }` | `setFormat` changed the format |
| `themeChange` | `{ dark: boolean }` | `setTheme` was called |
| `wordWrapChange` | `{ wordWrap: boolean }` | `setWordWrap` changed the wrapping |

The payload types are exported as `DiffViewerEvents`.

### Timing of the first result

`ready` and `error` for the documents passed to `createDiffViewer` are emitted after the constructor returns (in a microtask or after the comparison promise), so handlers registered right after `createDiffViewer` receive them. The constructor never throws for documents that cannot be compared.

`loading` is emitted at the start of `update()`. For the first comparison it is emitted inside the constructor (with `useWorker: true`, before any handler can be registered) or not at all (`useWorker: false`), so do not rely on it for the initial render.

## ready

```ts
viewer.on("ready", ({ summary, errors }) => {
  console.log(`${summary.total} changes`);
  console.log(`${summary.breaking} breaking, ${summary.risky} risky, ${summary.nonBreaking} non-breaking`);
  console.log(`${summary.deprecated} deprecated, ${summary.annotation} annotation, ${summary.unclassified} unclassified`);

  // problems inside the comparison: the diff still rendered
  for (const error of errors) {
    console.warn(error.kind, error.path.join("/"), error.message);
  }
});
```

`summary` is a `ChangeSummary`; `total` is the sum of the six counters and `byPath` maps each changed path to its change types and counts.

## Errors

`createDiffViewer` and `update` never throw for documents the engine cannot compare: they emit `error`, and the previous content (if any) stays on screen.

```ts
viewer.on("error", ({ kind, message, name, cause }) => {
  if (kind === "unsupported-spec") {
    status.textContent = `Cannot compare these documents: ${message}`;
  } else {
    status.textContent = `Error: ${message}`;
  }
});
```

`DiffViewerError` has `message`, `kind` (`DiffViewerErrorKind`), `name` (the error class name, kept across the worker boundary, for example `"UnsupportedSpecError"`) and `cause` (the thrown value).

| `kind` | When | What to do |
| --- | --- | --- |
| `unsupported-spec` | api-smart-diff throws `UnsupportedSpecError`: Swagger 2.0, OpenAPI 4+, AsyncAPI 1.x / 4+, an unknown GraphApi version, or two different specifications | Convert Swagger 2.0 to OpenAPI 3 first, or pass `mergeOptions: { engine: "jsonschema" }` to compare the documents as plain JSON |
| `invalid-input` | A string input is not valid JSON | Parse YAML yourself and pass the object |
| `internal` | Anything else (a worker failure, a rendering error, an invalid CodeMirror extension) | Report it |

## Comparison problems

Problems inside a comparison that still completed (an unresolved `$ref`, a custom rule or annotate hook that threw) do not stop the viewer: the affected nodes are compared as opaque values or classified as `unclassified`. They are passed as `errors` with `ready` and returned by `getCompareErrors()`:

```ts
for (const { kind, path, message, scope } of viewer.getCompareErrors()) {
  console.warn(`${kind} at /${path.join("/")}: ${message}`);
}
```

Each entry is an api-smart-diff `CompareError` without its `error` field (the original thrown value is dropped so the list can cross the worker boundary). To receive the problems yourself, set `mergeOptions.onError`; `errors` and `getCompareErrors()` are then empty, and the comparison runs on the main thread, since functions cannot be posted to a worker.
