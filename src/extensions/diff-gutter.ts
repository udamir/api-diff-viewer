import { type Extension, RangeSet } from "@codemirror/state";
import { EditorView, GutterMarker, gutter, gutters } from "@codemirror/view";
import type { DiffType } from "api-smart-diff";
import type { DiffBlockData } from "../diff-builder/common";
import { getDiffState } from "../state/diff-state";
import type { DiffData } from "../types";

/** CSS class names for gutter markers */
const gutterClasses = {
	marker: "cm-diff-marker",
	breaking: "cm-diff-marker-breaking",
	nonBreaking: "cm-diff-marker-non-breaking",
	annotation: "cm-diff-marker-annotation",
	unclassified: "cm-diff-marker-unclassified",
	added: "cm-diff-marker-added",
	removed: "cm-diff-marker-removed",
	modified: "cm-diff-marker-modified",
};

/** Gutter marker for diff changes */
class DiffGutterMarker extends GutterMarker {
	constructor(
		readonly diffType: DiffType,
		readonly action: "add" | "remove" | "replace" | "rename"
	) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement("div");
		wrapper.className = gutterClasses.marker;

		// Action symbol (+/-/~)
		const actionSpan = document.createElement("span");
		actionSpan.className = "cm-diff-marker-action";
		switch (this.action) {
			case "add":
				actionSpan.textContent = "+";
				actionSpan.classList.add(gutterClasses.added);
				break;
			case "remove":
				actionSpan.textContent = "-";
				actionSpan.classList.add(gutterClasses.removed);
				break;
			case "replace":
			case "rename":
				actionSpan.textContent = "~";
				actionSpan.classList.add(gutterClasses.modified);
				break;
		}
		wrapper.appendChild(actionSpan);

		// Diff type indicator (colored dot with tooltip)
		const typeIndicator = document.createElement("span");
		typeIndicator.className = "cm-diff-type-indicator";
		typeIndicator.textContent = "\u25CF";
		typeIndicator.title = this.diffType;

		switch (this.diffType) {
			case "breaking":
				typeIndicator.classList.add("cm-diff-type-breaking");
				break;
			case "non-breaking":
				typeIndicator.classList.add("cm-diff-type-non-breaking");
				break;
			case "annotation":
				typeIndicator.classList.add("cm-diff-type-annotation");
				break;
			case "unclassified":
				typeIndicator.classList.add("cm-diff-type-unclassified");
				break;
		}
		wrapper.appendChild(typeIndicator);

		return wrapper;
	}

	eq(other: DiffGutterMarker) {
		return this.diffType === other.diffType && this.action === other.action;
	}
}

/** Build gutter markers from diff blocks */
function buildGutterMarkers(
	view: EditorView,
	blocks: DiffBlockData[],
	side: "before" | "after" | "unified"
): RangeSet<GutterMarker> {
	const markers: { from: number; marker: GutterMarker }[] = [];
	const doc = view.state.doc;

	const processBlock = (block: DiffBlockData) => {
		if (block.diff) {
			const { type, action } = block.diff;

			// Markers are always applied; filtering is handled by folding
			const lineNum = block.index;
			if (lineNum > 0 && lineNum <= doc.lines) {
				// Determine if we should show this marker based on side and action
				let shouldShow = false;

				if (side === "unified") {
					shouldShow = true;
				} else if (side === "before") {
					shouldShow = action === "remove" || action === "replace" || action === "rename";
				} else if (side === "after") {
					shouldShow = action === "add" || action === "replace" || action === "rename";
				}

				if (shouldShow) {
					const line = doc.line(lineNum);
					markers.push({
						from: line.from,
						marker: new DiffGutterMarker(type, action),
					});
				}
			}
		}

		// Process children
		for (const child of block.children) {
			processBlock(child);
		}
	};

	for (const block of blocks) {
		processBlock(block);
	}

	// Sort by position and create RangeSet
	markers.sort((a, b) => a.from - b.from);
	return RangeSet.of(markers.map((m) => m.marker.range(m.from)));
}

/** Empty gutter marker for spacing */
class EmptyGutterMarker extends GutterMarker {
	toDOM() {
		const spacer = document.createElement("div");
		spacer.className = gutterClasses.marker;
		spacer.textContent = " ";
		return spacer;
	}
}

const emptyMarker = new EmptyGutterMarker();

/** Create diff gutter extension */
export function diffGutter(_data: DiffData): Extension {
	return [
		gutters(),
		gutter({
			class: "cm-diff-gutter",
			markers: (view) => {
				const state = getDiffState(view.state);
				return buildGutterMarkers(view, state.blocks, state.side);
			},
			initialSpacer: () => emptyMarker,
		}),
		diffGutterTheme,
	];
}

/** Theme styles for diff gutter */
export const diffGutterTheme = EditorView.baseTheme({
	".cm-diff-gutter": {
		width: "40px",
		backgroundColor: "var(--diff-gutter-bg, #f6f8fa)",
		borderRight: "1px solid var(--diff-gutter-border, #d0d7de)",
	},
	".cm-diff-marker": {
		display: "flex",
		alignItems: "center",
		gap: "2px",
		width: "100%",
		height: "100%",
		padding: "0 4px",
		fontFamily: "monospace",
		fontSize: "12px",
	},
	".cm-diff-marker-action": {
		fontWeight: "bold",
	},
	".cm-diff-marker-added": {
		color: "var(--diff-non-breaking-color, #3fb950)",
	},
	".cm-diff-marker-removed": {
		color: "var(--diff-breaking-color, #f85149)",
	},
	".cm-diff-marker-modified": {
		color: "var(--diff-modified-marker-color, #d29922)",
	},
	".cm-diff-type-indicator": {
		fontSize: "8px",
		lineHeight: "1",
		cursor: "default",
	},
	".cm-diff-type-breaking": {
		color: "var(--diff-breaking-color, #f85149)",
	},
	".cm-diff-type-non-breaking": {
		color: "var(--diff-non-breaking-color, #3fb950)",
	},
	".cm-diff-type-annotation": {
		color: "var(--diff-annotation-color, #a371f7)",
	},
	".cm-diff-type-unclassified": {
		color: "var(--diff-unclassified-color, #768390)",
	},
});

export { DiffGutterMarker, buildGutterMarkers };
