import { type Extension, RangeSet } from "@codemirror/state";
import { EditorView, GutterMarker, gutter, gutters } from "@codemirror/view";
import type { DiffType } from "api-smart-diff";
import type { DiffBlockData } from "../../diff-builder/common";
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
		const marker = document.createElement("div");
		marker.className = gutterClasses.marker;

		// Add type-specific class
		switch (this.diffType) {
			case "breaking":
				marker.classList.add(gutterClasses.breaking);
				break;
			case "non-breaking":
				marker.classList.add(gutterClasses.nonBreaking);
				break;
			case "annotation":
				marker.classList.add(gutterClasses.annotation);
				break;
			case "unclassified":
				marker.classList.add(gutterClasses.unclassified);
				break;
		}

		// Add action-specific class
		switch (this.action) {
			case "add":
				marker.classList.add(gutterClasses.added);
				marker.textContent = "+";
				break;
			case "remove":
				marker.classList.add(gutterClasses.removed);
				marker.textContent = "-";
				break;
			case "replace":
			case "rename":
				marker.classList.add(gutterClasses.modified);
				marker.textContent = "~";
				break;
		}

		return marker;
	}

	eq(other: DiffGutterMarker) {
		return this.diffType === other.diffType && this.action === other.action;
	}
}

/** Build gutter markers from diff blocks */
function buildGutterMarkers(
	view: EditorView,
	blocks: DiffBlockData[],
	side: "before" | "after" | "unified",
	filters: DiffType[]
): RangeSet<GutterMarker> {
	const markers: { from: number; marker: GutterMarker }[] = [];
	const doc = view.state.doc;

	const processBlock = (block: DiffBlockData) => {
		if (block.diff) {
			const { type, action } = block.diff;

			// Check if this diff type is in the active filters
			if (filters.includes(type)) {
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
				return buildGutterMarkers(view, state.blocks, state.side, state.activeFilters);
			},
			initialSpacer: () => emptyMarker,
		}),
		diffGutterTheme,
	];
}

/** Theme styles for diff gutter */
export const diffGutterTheme = EditorView.baseTheme({
	".cm-diff-gutter": {
		width: "24px",
		backgroundColor: "var(--diff-gutter-bg, #f6f8fa)",
		borderRight: "1px solid var(--diff-gutter-border, #d0d7de)",
	},
	".cm-diff-marker": {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		height: "100%",
		fontSize: "12px",
		fontWeight: "bold",
		fontFamily: "monospace",
	},
	".cm-diff-marker-breaking": {
		color: "var(--diff-breaking-color, #f85149)",
	},
	".cm-diff-marker-non-breaking": {
		color: "var(--diff-non-breaking-color, #3fb950)",
	},
	".cm-diff-marker-annotation": {
		color: "var(--diff-annotation-color, #a371f7)",
	},
	".cm-diff-marker-unclassified": {
		color: "var(--diff-unclassified-color, #768390)",
	},
	".cm-diff-marker-added": {
		backgroundColor: "var(--diff-added-gutter-bg, rgba(46, 160, 67, 0.2))",
	},
	".cm-diff-marker-removed": {
		backgroundColor: "var(--diff-removed-gutter-bg, rgba(248, 81, 73, 0.2))",
	},
	".cm-diff-marker-modified": {
		backgroundColor: "var(--diff-modified-gutter-bg, rgba(227, 179, 65, 0.2))",
	},
});

export { DiffGutterMarker, buildGutterMarkers };
