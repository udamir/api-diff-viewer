# Theming

The viewer has a light and a dark theme modelled on GitHub's diff colours. Both are CodeMirror themes, so they style the editors without a stylesheet.

## Light and dark

```ts
const viewer = createDiffViewer(container, before, after, { dark: true });

// switch at runtime, for example when the page theme changes
viewer.setTheme({ dark: false });
viewer.isDark(); // false
```

`setTheme` emits `themeChange` with `{ dark }`. The dark theme switches the editor background (`#0d1117`), the text and syntax colours, the diff colours and the badges.

To follow the operating system setting:

```ts
const media = window.matchMedia("(prefers-color-scheme: dark)");
const viewer = createDiffViewer(container, before, after, { dark: media.matches });
media.addEventListener("change", (event) => viewer.setTheme({ dark: event.matches }));
```

## Colour overrides

`colors` (option or `setTheme({ colors })`) overrides any colour of the diff theme. Unset keys keep the default of the current light or dark theme.

```ts
createDiffViewer(container, before, after, {
  dark: true,
  colors: {
    breakingColor: "#ff6b6b",
    nonBreakingColor: "#51cf66",
  },
});

viewer.setTheme({ colors: { addedBg: "rgba(46, 160, 67, 0.25)" } });
```

`setTheme({ colors })` replaces the previous overrides (it does not merge with them); `setTheme({ dark })` keeps them.

| Key | CSS variable | Light default | Dark default | Used for |
| --- | --- | --- | --- | --- |
| `addedBg` | `--diff-added-bg` | `rgba(46, 160, 67, 0.15)` | `rgba(46, 160, 67, 0.2)` | Added lines |
| `removedBg` | `--diff-removed-bg` | `rgba(248, 81, 73, 0.15)` | `rgba(248, 81, 73, 0.2)` | Removed lines |
| `modifiedBg` | `--diff-modified-bg` | `rgba(227, 179, 65, 0.15)` | `rgba(227, 179, 65, 0.2)` | Modified lines |
| `addedTextBg` | `--diff-added-text-bg` | `rgba(46, 160, 67, 0.4)` | `rgba(46, 160, 67, 0.5)` | Added words (word diff) |
| `removedTextBg` | `--diff-removed-text-bg` | `rgba(248, 81, 73, 0.4)` | `rgba(248, 81, 73, 0.5)` | Removed words (word diff) |
| `breakingColor` | `--diff-breaking-color` | `#cf222e` | `#f85149` | Breaking changes |
| `riskyColor` | `--diff-risky-color` | `#bc4c00` | `#f0883e` | Risky changes |
| `nonBreakingColor` | `--diff-non-breaking-color` | `#1a7f37` | `#3fb950` | Non-breaking changes |
| `deprecatedColor` | `--diff-deprecated-color` | `#9a6700` | `#d29922` | Deprecations |
| `annotationColor` | `--diff-annotation-color` | `#8250df` | `#a371f7` | Annotation changes |
| `unclassifiedColor` | `--diff-unclassified-color` | `#656d76` | `#768390` | Unclassified changes |
| `spacerBg` | `--diff-spacer-bg` | `#f6f8fa` | `#161b22` | Spacer lines (alignment) |
| `spacerStripe` | `--diff-spacer-stripe` | `#e1e4e8` | `#30363d` | Stripes of the spacer lines |
| `correspondingHighlight` | `--diff-corresponding-highlight` | `rgba(56, 139, 253, 0.15)` | `rgba(56, 139, 253, 0.2)` | Declared for highlighting the corresponding line in the other editor; no decoration reads it in 2.0 |

The defaults are exported as `lightColors` and `darkColors`.

## CSS variables

The diff theme sets the variables of the table on each editor element (`.cm-editor`). The decorations and badges also read further variables with built-in fallbacks, which you can set in your stylesheet:

| Variables | Used for |
| --- | --- |
| `--diff-selected-bg`, `--diff-selected-border` | The selected block |
| `--diff-gutter-bg`, `--diff-gutter-border` | The diff marker gutter |
| `--diff-badge-<type>-bg`, `--diff-badge-<type>-color`, `--diff-badge-<type>-border` | Change badges and fold counters per type (`breaking`, `risky`, `non-breaking`, `deprecated`, `annotation`, `unclassified`) |
| `--diff-fold-widget-bg`, `--diff-fold-widget-border`, `--diff-fold-widget-color`, `--diff-fold-widget-hover-bg` | The fold placeholder |
| `--diff-word-added-bg`, `--diff-word-removed-bg`, `--diff-word-removed-strike` | Word diff highlights |
| `--diff-inline-added-bg`, `--diff-inline-removed-bg`, `--diff-inline-removed-color` | Removed text shown inside inline mode |

Because the theme declares its variables on `.cm-editor`, a declaration on `:root` does not override them. Use `colors`, or a selector that is more specific than the theme class:

```css
#diff .cm-editor {
  --diff-breaking-color: #d1242f;
  --diff-badge-breaking-bg: #ffebe9;
}
```

The optional stylesheet `api-diff-viewer/style.css` (`dist/api-diff-viewer.css`) declares the light values on `:root` and the dark values on `.dark` and `[data-theme="dark"]` (see [Installation](/guide/installation#stylesheet)).

## Base CodeMirror theme

`theme` adds a CodeMirror theme extension before the diff theme, and `setTheme({ theme })` replaces it (this rebuilds the editors):

```ts
import { diffThemeDark } from "api-diff-viewer";

createDiffViewer(container, before, after, { dark: true, theme: diffThemeDark });
```

`diffThemeLight` and `diffThemeDark` are the viewer's own editor themes (fonts, gutters, active line); `diffTheme({ dark, colors })` builds the full diff theme. Themes created with a separately installed `@codemirror/view` are subject to the [one CodeMirror instance](/guide/extensions#one-codemirror-instance) limitation.
