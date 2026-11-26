# Contributing

The source is on GitHub: [udamir/api-diff-viewer](https://github.com/udamir/api-diff-viewer). Bug reports and pull requests are welcome; for a wrong or missing change classification, check first whether it comes from [api-smart-diff](https://github.com/udamir/api-smart-diff) (the viewer only renders what it reports).

## Requirements

- Node.js 22.18 or later (Vite+ and Vitest 5 need `^22.18.0 || ^24.11.0 || >=26.0.0`). Using the package needs Node.js 22 only for tooling and SSR builds.
- pnpm 10: the version is pinned in the `packageManager` field of `package.json`; `corepack enable` picks it up.

The toolchain is [Vite+](https://viteplus.dev) (`vp`): Vite and Rolldown for the demo, tsdown (`vp pack`) for the library build, Vitest 5 for the tests, Oxlint and Oxfmt plus the TypeScript 7 type check for `vp check`. The documentation portal is built with VitePress.

## Commands

```sh
pnpm install                  # install dependencies
pnpm run build                # library build (vp pack): dist/api-diff-viewer.es.js, .umd.js, .css, index.d.ts
pnpm run dev                  # demo page with live reload (vp dev)
pnpm run build-demo           # demo build to demo-dist/
pnpm run test                 # all Vitest projects: unit tests and the Storybook tests in Chromium
pnpm run test --project unit  # unit tests only
pnpm run test:watch           # watch mode
pnpm run test-storybook       # Storybook play functions in Chromium (pnpm exec playwright install chromium once)
pnpm run check                # format, lint and type check (vp check); pnpm run check:fix applies the fixes
pnpm run typecheck            # TypeScript 7 (tsc --noEmit)
pnpm run storybook            # Storybook on port 6006
pnpm run docs:dev             # this documentation portal with live reload
pnpm run docs:build           # portal build to docs/.vitepress/dist (fails on dead links)
pnpm run docs:preview         # serve the built portal
```

## Repository layout

| Path | Content |
| --- | --- |
| `src/` | The library: `diff-viewer.ts` (entry class), `diff-builder/` (merged document to blocks and tokens), `views/` (side-by-side and inline views), `extensions/` (CodeMirror decorations, gutters, word diff, badges), `sync/` (alignment, height and fold sync), `navigation/`, `worker/` |
| `tests/` | Unit tests (Vitest, Node.js) |
| `storybook/` | Stories and the Storybook interaction tests (Vitest browser mode) |
| `demo/` | The local demo page (`pnpm run dev`) |
| `docs/` | This portal (VitePress); `docs/demo.md` is the live demo |

## Documentation

- Every public export of `src/index.ts` must be listed in the [API reference](/guide/api): the unit test `tests/docs/api-reference.test.ts` fails when an export is missing there or when the page lists a name that is not exported.
- The portal imports the viewer from `src/`, so the live demo always shows the current sources.
- Write each paragraph on one line (no hard wraps).
