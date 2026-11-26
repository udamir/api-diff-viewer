# Change types and colours

api-smart-diff 2.x classifies every change by its effect on the existing clients of the API. The viewer shows the class of each change with a colour and counts the changes per class.

| Type | Meaning | Examples | Light | Dark |
| --- | --- | --- | --- | --- |
| <span class="adv-type breaking">breaking</span> | Existing clients fail | Removing an endpoint or a parameter, changing a type, adding a required request field | <span class="adv-swatch" style="background: #cf222e"></span>`#cf222e` | <span class="adv-swatch" style="background: #f85149"></span>`#f85149` |
| <span class="adv-type risky">risky</span> | Valid for most clients, can break some | An enum value added to a response, a looser bound on a response value, a new argument with a default | <span class="adv-swatch" style="background: #bc4c00"></span>`#bc4c00` | <span class="adv-swatch" style="background: #f0883e"></span>`#f0883e` |
| <span class="adv-type non-breaking">non-breaking</span> | Existing clients keep working | Adding an optional parameter or property, relaxing a request constraint, a new endpoint | <span class="adv-swatch" style="background: #1a7f37"></span>`#1a7f37` | <span class="adv-swatch" style="background: #3fb950"></span>`#3fb950` |
| <span class="adv-type deprecated">deprecated</span> | Something was deprecated | `deprecated: true` on an operation or parameter, a GraphQL `@deprecated` field | <span class="adv-swatch" style="background: #9a6700"></span>`#9a6700` | <span class="adv-swatch" style="background: #d29922"></span>`#d29922` |
| <span class="adv-type annotation">annotation</span> | Documentation only | A description, summary, example or `x-*` extension changed | <span class="adv-swatch" style="background: #8250df"></span>`#8250df` | <span class="adv-swatch" style="background: #a371f7"></span>`#a371f7` |
| <span class="adv-type unclassified">unclassified</span> | No rule applies | A change in a component that nothing references | <span class="adv-swatch" style="background: #656d76"></span>`#656d76` | <span class="adv-swatch" style="background: #768390"></span>`#768390` |

Whether a change is breaking depends on where it is: a new required property breaks a request but not a response. api-smart-diff decides this from the position of the change and, for shared components, from their usages; see [classification](https://udamir.github.io/api-smart-diff/guide/classification) in the api-smart-diff documentation.

## Where the types are shown

- **Line backgrounds.** Added lines are green, removed lines red and modified lines yellow, whatever the change type; the word diff highlights the changed words inside a modified line.
- **Gutter bars** (`showClassification`). A coloured bar next to each changed line shows its type (class `cm-diff-type-<type>`).
- **Fold counters** (`enableFolding` and `showClassification`). A folded block shows one counter per change type it contains (class `cm-diff-fold-badge-<type>`).
- **Change badges** (`showClassification`). Counters at the end of the line of a block with changes (class `cm-change-badge-<type>`).
- **Summary.** The `ready` event and `getChangeSummary()` count the changes per type.

## Counting

`ChangeSummary` has one counter per type, with camelCase keys, and `total`, the sum of the six:

```ts
viewer.on("ready", ({ summary }) => {
  const { total, breaking, risky, nonBreaking, deprecated, annotation, unclassified } = summary;
});
```

The package exports the type list and its labels for legends and filters:

| Export | Value |
| --- | --- |
| `diffTypes` | `["breaking", "risky", "non-breaking", "deprecated", "annotation", "unclassified"]`, from the most to the least severe; also the index order of `DiffBlockData.diffs` |
| `diffTypeLabels` | `{ breaking: "Breaking", risky: "Risky", "non-breaking": "Non-breaking", ... }` |
| `diffTypeCountKeys` | The `ChangeSummary` / `ClassificationCounts` key of each type: `{ "non-breaking": "nonBreaking", ... }` |

```ts
import { diffTypeCountKeys, diffTypeLabels, diffTypes } from "api-diff-viewer";

viewer.on("ready", ({ summary }) => {
  legend.textContent = diffTypes.map((type) => `${diffTypeLabels[type]}: ${summary[diffTypeCountKeys[type]]}`).join(", ");
});
```

## Filtering by type

`filters` (option or `setFilters`) shows only the changes of the listed types; every block without such a change is folded.

```ts
viewer.setFilters(["breaking", "risky"]);
viewer.setFilters([]); // show everything
```

## Changing the colours

The colours above are the defaults of the light and dark themes. Override them with `colors`, see [Theming](/guide/theming).
