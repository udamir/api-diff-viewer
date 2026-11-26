# Getting started

This page renders a first diff: two small OpenAPI documents compared side by side.

## 1. Install

```sh
npm install api-diff-viewer
```

## 2. Add a container

The viewer fills its container, so give the container a height:

```html
<div id="diff" style="height: 600px; border: 1px solid #d0d7de"></div>
```

## 3. Create the viewer

```ts
import { createDiffViewer } from "api-diff-viewer";

const before = {
  openapi: "3.1.0",
  info: { title: "Pet store", version: "1.0.0" },
  paths: {
    "/pets": {
      get: {
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", maximum: 100 } }],
        responses: { "200": { description: "A list of pets" } },
      },
    },
  },
};

const after = {
  openapi: "3.1.0",
  info: { title: "Pet store", version: "1.1.0" },
  paths: {
    "/pets": {
      get: {
        parameters: [{ name: "limit", in: "query", required: true, schema: { type: "integer", maximum: 50 } }],
        responses: { "200": { description: "A page of pets" } },
      },
    },
  },
};

const viewer = createDiffViewer(document.getElementById("diff")!, before, after, {
  mode: "side-by-side",
  format: "yaml",
  showClassification: true,
});

viewer.on("ready", ({ summary }) => {
  console.log(`${summary.total} changes, ${summary.breaking} breaking`);
});

viewer.on("error", ({ kind, message }) => {
  console.error(`Cannot compare (${kind}): ${message}`);
});
```

The before editor shows `limit` without `required` and with `maximum: 100`; the after editor shows the new values. Making the parameter required and lowering its maximum are breaking changes for existing clients; the new response description is an annotation.

## 4. Clean up

The viewer owns its editors and listeners. Destroy it when its container is removed:

```ts
viewer.destroy();
```

## Inputs

`before` and `after` are parsed documents (plain objects) or JSON strings. YAML strings are not parsed: they are reported as an `invalid-input` error. Parse YAML yourself, for example with js-yaml:

```ts
import { load } from "js-yaml";

const viewer = createDiffViewer(container, load(beforeYaml) as object, load(afterYaml) as object);
```

## In a framework

Create the viewer after the element is in the DOM and destroy it when the component is unmounted. For example in Vue:

```vue
<script setup lang="ts">
import { createDiffViewer, type DiffViewer } from "api-diff-viewer";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{ before: object; after: object }>();
const host = ref<HTMLElement>();
let viewer: DiffViewer | undefined;

onMounted(() => {
  viewer = createDiffViewer(host.value!, props.before, props.after);
});
watch(
  () => [props.before, props.after] as const,
  ([before, after]) => viewer?.update(before, after)
);
onBeforeUnmount(() => viewer?.destroy());
</script>

<template>
  <div ref="host" style="height: 600px" />
</template>
```

and in React:

```tsx
import { createDiffViewer, type DiffViewer } from "api-diff-viewer";
import { useEffect, useRef } from "react";

export function ApiDiff({ before, after }: { before: object; after: object }) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<DiffViewer | null>(null);

  useEffect(() => {
    const created = createDiffViewer(host.current!, before, after);
    viewer.current = created;
    return () => {
      created.destroy();
      viewer.current = null;
    };
  }, []);

  const first = useRef(true);
  useEffect(() => {
    // the first render is compared by createDiffViewer; later document changes by update
    if (first.current) {
      first.current = false;
      return;
    }
    viewer.current?.update(before, after);
  }, [before, after]);

  return <div ref={host} style={{ height: 600 }} />;
}
```

## Next steps

- [Usage](/guide/usage): the runtime methods (mode, format, filters, theme, folding).
- [Options](/guide/options): every option of `createDiffViewer`.
- [Events and errors](/guide/events): `ready`, `error` and the comparison problems.
