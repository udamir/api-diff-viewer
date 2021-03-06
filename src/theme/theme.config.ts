import { Theme, ThemeType } from "./theme.model";

export const defaultThemes: Record<ThemeType, Theme> = {
  default: {
    "--add-bg-color": "#00BB5B12",
    "--remove-bg-color": "#ff526112",
    "--replace-bg-color": "#FFB02E12",
    "--rename-bg-color": "#FFB02E12",
    "--hidden-bg-color": "#F2F3F5",
    "--base-font-family": 'Menlo, Monaco, "Courier New", monospace',
    "--navigation-font-family": 'ui-sans-serif, system-ui, "Segoe UI", Roboto',
    "--base-bg-color": "white",
    "--base-text-color": "#0451a5",
    "--base-splitter-color": "lightgray",
    "--block-selection-color": "blue",
    "--line-num-text-color": "#6e7681",
    "--toggle-color": "lightgray",
    "--annotation-color": "rgba(186, 85, 211, 1)",
    "--non-breaking-color": "rgba(15, 169, 56, 1)",
    "--breaking-color": "rgba(235, 0, 0, 1)",
    "--unclassified-color": "rgba(169, 169, 169, 1)",
    "--annotation-bg-color": "rgba(186, 85, 211, 0.7)",
    "--non-breaking-bg-color": "rgba(15, 169, 56, 0.7)",
    "--breaking-bg-color": "rgba(235, 0, 0, 0.7)",
    "--unclassified-bg-color": "rgba(169, 169, 169, 0.7)",
    "--token-spec-text-color": "#008080",
    "--token-key-text-color": "#008080",
    "--token-index-text-color": "#008080",
    "--token-string-text-color": "#0451a5",
    "--token-added-text-color": "#D0FAD4",
    "--token-deleted-text-color": "#FFC8C1",
    "--navigation-get-color": "#48bb78",
    "--navigation-post-color": "#008eff",
    "--navigation-put-color": "#ed8936",
    "--navigation-delete-color": "#f56565",
    "--navigation-default-color": "#ed8936",
    "--navigation-active-bg-color": "lightgray",
    "--navigation-hover-bg-color": "#F2F3F5",
    "--navigation-path-text-color": "black",
  }
}
