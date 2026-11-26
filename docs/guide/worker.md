# Web Worker

Comparing two large API documents can take a noticeable time. The viewer can run the comparison in a Web Worker, so the page stays responsive while api-smart-diff works; rendering always happens on the main thread.

## Current behaviour

| Options | Where the comparison runs | Result |
| --- | --- | --- |
| `useWorker: true` (default), no `workerUrl` | **On the main thread**, synchronously, inside a promise | `ready` / `error` after the constructor returns |
| `useWorker: true`, `workerUrl` set | In a module worker loaded from `workerUrl` | `ready` / `error` when the worker replies |
| `useWorker: false` | On the main thread, synchronously, in the constructor or in `update()` | `ready` / `error` in a microtask (constructor) or before `update()` returns |

The package does not ship a worker script yet, and the default `useWorker: true` without `workerUrl` does not create a worker: it runs the same synchronous comparison as `useWorker: false`, only reported asynchronously. To keep large comparisons off the main thread, provide your own worker with `workerUrl`, as shown below.

The viewer also falls back to the main thread when the worker cannot be created (a warning is logged), after the worker fails (`onerror`), and for `mergeOptions` holding functions (`rules`, `extensions`, `annotateHook`, `onError`), which cannot be posted to a worker.

## Writing a worker

The worker receives `{ id, type: "merge", payload: { before, after, options } }` and replies with `{ id, type: "result", payload: { merged, errors } }`, or with `{ id, type: "error", payload: { message, name } }` when the comparison throws. `name` keeps the error class (for example `"UnsupportedSpecError"`), since `instanceof` does not survive `postMessage`. The viewer creates the worker with `{ type: "module" }`.

```ts
// compare.worker.ts
import { apiCompare } from "api-smart-diff";

self.onmessage = ({ data }) => {
  if (data.type !== "merge") return;
  const { before, after, options } = data.payload;
  try {
    const result = apiCompare(before, after, options);
    // drop `error` (an arbitrary thrown value) so the errors can be posted
    const errors = (result.errors ?? []).map(({ kind, message, path, scope }) => ({ kind, message, path: [...path], scope }));
    self.postMessage({ id: data.id, type: "result", payload: { merged: result.merged, errors } });
  } catch (error) {
    const { name, message } = error instanceof Error ? error : { name: undefined, message: String(error) };
    self.postMessage({ id: data.id, type: "error", payload: { message, name } });
  }
};
```

Install `api-smart-diff` 2.x as a dependency of your app for the worker (the viewer's bundle does not expose it), and let your bundler emit the worker file. With Vite:

```ts
import { createDiffViewer } from "api-diff-viewer";
import workerUrl from "./compare.worker.ts?worker&url";

const viewer = createDiffViewer(container, before, after, { workerUrl });
```

The options sent to the worker always include `metaKey: "$diff"` and `arrayMeta: false`, which the viewer needs to read the merged document; pass them on to `apiCompare` unchanged.

## Choosing

- Small and medium documents: keep the default; the comparison is fast and runs before the first paint either way.
- Large documents, or comparisons triggered while the user types: use a worker via `workerUrl`, so typing and scrolling are not blocked.
- Code that needs the result synchronously after `update()` (tests, scripts): use `useWorker: false`.

`DiffWorkerManager` (exported) is the class the viewer uses to talk to the worker; you can use it to run comparisons yourself with the same fallbacks.
