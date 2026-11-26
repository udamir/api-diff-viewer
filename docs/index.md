---
layout: home

hero:
  name: api-diff-viewer
  text: See what changed in your API
  tagline: A framework-free CodeMirror 6 component that renders the difference between two versions of an OpenAPI, AsyncAPI, GraphQL (GraphApi), gRPC (ProtoApi) or JSON Schema document, side by side or inline, with every change classified by api-smart-diff 2.x.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Try the live demo
      link: /demo
    - theme: alt
      text: API reference
      link: /guide/api

features:
  - icon: 📚
    title: Five specifications
    details: OpenAPI 3.0, 3.1 and 3.2, AsyncAPI 2.x and 3.0, GraphApi 1.0 (GraphQL), ProtoApi (gRPC / Protocol Buffers) and JSON Schema, detected from the documents by api-smart-diff 2.x.
    link: /guide/
    linkText: Introduction
  - icon: 🚦
    title: Six change types
    details: Every change is breaking, risky, non-breaking, deprecated, annotation or unclassified, shown with its own colour in the gutter, fold badges and counters, and filterable.
    link: /guide/change-types
    linkText: Change types and colours
  - icon: ↔️
    title: Side by side or inline
    details: Two aligned editors with synchronised scrolling, folding and wrapped-line heights, or one unified editor; YAML or JSON output; word- or character-level highlights.
    link: /guide/options
    linkText: Options
  - icon: 🧭
    title: Navigation API
    details: Jump to the next breaking change, open a path such as <code>paths/~1pets/get</code>, search keys and values, and inspect the change counts of any subtree.
    link: /guide/navigation
    linkText: Navigation API
  - icon: 🎨
    title: Light and dark themes
    details: Built-in GitHub-like light and dark themes, switchable at runtime, with colour overrides for every change type and highlight.
    link: /guide/theming
    linkText: Theming
  - icon: 🧩
    title: No framework
    details: Plain DOM and CodeMirror 6, so it mounts into any element in React, Vue, Svelte, Angular or a plain page; also available as a UMD global <code>ApiDiffViewer</code>.
    link: /guide/installation
    linkText: Installation
---
