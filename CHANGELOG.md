# Changelog

## 1.2.0

The viewer now uses api-smart-diff 2.x. Changes in comparison results (new formats, the `risky` type, renames, classifications, unsupported documents) are listed in the [api-smart-diff changelog](https://udamir.github.io/api-smart-diff/changelog). Upgrade steps: [Migration from 1.1](https://udamir.github.io/api-diff-viewer/guide/migration).

### Breaking changes

- Change counts (`ChangeSummary`, `ClassificationCounts`, `BadgeData`) have `risky` and `deprecated`; `ChildKeyInfo.changeCounts` is an object instead of a tuple; `DiffBlockData.diffs` has six entries.
- `ready` passes `{ summary, errors }`; `error` passes `{ message, kind, name?, cause? }`.
- The constructor no longer throws; failures are reported with the `error` event.
- `mergeOptions` uses the api-smart-diff 2.x `CompareOptions` type.
- `correspondingHighlight` is removed from the theme colours (it had no effect).
- Custom workers (`workerUrl`) must reply with `{ merged, errors }`.
- The ES module imports its dependencies instead of bundling them; the UMD build is still self-contained.
- Type declarations are bundled into `dist/index.d.ts`.
- Node.js 22 or later is required.

### New

- `import "api-diff-viewer/style.css"`.
- `getCompareErrors()`.
- `diffTypes`, `diffTypeLabels` and `diffTypeCountKeys` exports.
- Colours, badges and filters for `risky` and `deprecated` changes.

### Fixes

- Your own CodeMirror extensions and themes take effect with the ES module.
- An array is no longer marked with the change of its items.
- `getChildKeys()` reports the changes of array items.
- A YAML string input reports an `invalid-input` error instead of throwing.

## Earlier versions

Earlier releases: https://github.com/udamir/api-diff-viewer/releases
