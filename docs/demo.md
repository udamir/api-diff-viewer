---
layout: page
title: Live demo
description: Compare two API documents in your browser and see them in api-diff-viewer, side by side or inline, with every change classified by api-smart-diff 2.x.
---

<script setup>
import ViewerDemo from "./.vitepress/theme/components/ViewerDemo.vue"
</script>

<div class="demo-page">

# Live demo

Edit the two documents and the viewer below updates as you type. The viewer is built from the current sources of this repository. See **How to use** next to the viewer tab for details.

<ClientOnly>
<ViewerDemo>
<template #help>

### Documents

Edit or paste two versions of an API document as YAML or JSON: OpenAPI 3.0 / 3.1 / 3.2, AsyncAPI 2.x / 3.0, GraphApi 1.0, ProtoApi or JSON Schema. **Example** loads a pair of documents for each specification (the samples of the repository's Storybook), including a Swagger 2.0 pair that the viewer rejects. **Editors** switches both editors between YAML and JSON, and **Swap** exchanges the before and after documents. The page parses the editors with js-yaml and passes the objects to the viewer, which accepts parsed documents or JSON strings only (see [Getting started](/guide/getting-started#inputs)).

### Live update

The viewer is updated a quarter of a second after you stop typing, with `viewer.update(before, after)`. While a document does not parse, the parse error is shown and the last diff stays on screen, marked **stale**. Documents the viewer cannot compare (Swagger 2.0, two different specifications) are reported by its [`error` event](/guide/events#errors); the previous diff then stays, also marked stale.

### Viewer options

The controls set the [options](/guide/options) of the viewer: **Layout** (`mode`), **Output** (`format`), **Theme** (`dark`, following the page theme by default), **Word diff** (`wordDiffMode`), **word wrap**, **folding** (`enableFolding`) and **classification** (`showClassification`) use the runtime setters of the same viewer. **merged** and **engine** are api-smart-diff options (`mergeOptions`) and **search** adds the `@codemirror/search` extension (`extensions`); these are construction options, so the page creates a new viewer for them.

### Change types and navigation

The chips count the changes of each [type](/guide/change-types) (`ready` event). Click chips to filter: the viewer folds every block without a change of the selected types. **Previous** and **Next** move through the changes (of the selected types) with the [Navigation API](/guide/navigation) and show the current path; **Expand all** and **Collapse all** fold or unfold every block.

### Code, problems and sharing

**Code** shows the `createDiffViewer` call with the current options. **Comparison problems** lists the problems api-smart-diff reported inside the comparison (`getCompareErrors()`). **Share** puts both documents and the options into the address (compressed in the URL hash) and copies the link; nothing is sent anywhere.

</template>
</ViewerDemo>
</ClientOnly>

</div>

<style>
/* full viewport width (the editors and the viewer span it); the intro text keeps a readable line length */
.demo-page {
  margin: 0 auto;
  padding: 32px 32px 48px;
}

@media (max-width: 640px) {
  .demo-page {
    padding: 24px 16px 40px;
  }
}

.demo-page h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.demo-page > p {
  max-width: var(--adv-prose-width);
  color: var(--vp-c-text-2);
  margin-bottom: 20px;
}
</style>
