import { Facet, type FacetReader, StateEffect, StateField } from "@codemirror/state";
import type { DiffType } from "api-smart-diff";
import type { DiffBlockData } from "../../diff-builder/common";
import type { BlockMapping, DiffConfig, DiffData, LineMapping } from "../types";

/** State for tracking diff data within the editor */
export interface DiffEditorState {
	blocks: DiffBlockData[];
	lineMap: LineMapping[];
	blockMap: BlockMapping[];
	expandedBlocks: Set<string>;
	selectedBlock: string | null;
	activeFilters: DiffType[];
	displayMode: "inline" | "side-by-side";
	format: "json" | "yaml";
	side: "before" | "after" | "unified";
}

/** Create initial state */
function createInitialState(): DiffEditorState {
	return {
		blocks: [],
		lineMap: [],
		blockMap: [],
		expandedBlocks: new Set(),
		selectedBlock: null,
		activeFilters: ["breaking", "non-breaking", "annotation", "unclassified"],
		displayMode: "side-by-side",
		format: "yaml",
		side: "after",
	};
}

// State Effects for updating diff state
export const setDiffDataEffect = StateEffect.define<DiffData>();
export const setSelectedBlockEffect = StateEffect.define<string | null>();
export const toggleBlockExpandedEffect = StateEffect.define<string>();
export const setExpandedBlocksEffect = StateEffect.define<Set<string>>();
export const setFiltersEffect = StateEffect.define<DiffType[]>();
export const setDisplayModeEffect = StateEffect.define<"inline" | "side-by-side">();
export const setFormatEffect = StateEffect.define<"json" | "yaml">();
export const setSideEffect = StateEffect.define<"before" | "after" | "unified">();

/** State field for diff data */
export const diffStateField = StateField.define<DiffEditorState>({
	create() {
		return createInitialState();
	},

	update(state, transaction) {
		let newState = state;

		for (const effect of transaction.effects) {
			if (effect.is(setDiffDataEffect)) {
				newState = {
					...newState,
					blocks: effect.value.blocks,
					lineMap: effect.value.lineMap,
					blockMap: effect.value.blockMap,
				};
			} else if (effect.is(setSelectedBlockEffect)) {
				newState = {
					...newState,
					selectedBlock: effect.value,
				};
			} else if (effect.is(toggleBlockExpandedEffect)) {
				const newExpanded = new Set(newState.expandedBlocks);
				if (newExpanded.has(effect.value)) {
					newExpanded.delete(effect.value);
				} else {
					newExpanded.add(effect.value);
				}
				newState = {
					...newState,
					expandedBlocks: newExpanded,
				};
			} else if (effect.is(setExpandedBlocksEffect)) {
				newState = {
					...newState,
					expandedBlocks: effect.value,
				};
			} else if (effect.is(setFiltersEffect)) {
				newState = {
					...newState,
					activeFilters: effect.value,
				};
			} else if (effect.is(setDisplayModeEffect)) {
				newState = {
					...newState,
					displayMode: effect.value,
				};
			} else if (effect.is(setFormatEffect)) {
				newState = {
					...newState,
					format: effect.value,
				};
			} else if (effect.is(setSideEffect)) {
				newState = {
					...newState,
					side: effect.value,
				};
			}
		}

		return newState;
	},
});

/** Facet for providing diff configuration */
export const diffConfigFacet = Facet.define<Partial<DiffConfig>, DiffConfig>({
	combine(values): DiffConfig {
		const defaultConfig: DiffConfig = {
			side: "after",
			format: "yaml",
			showGutter: true,
			showBadges: true,
			showMinimap: false,
			enableFolding: true,
			enableSearch: true,
			filters: ["breaking", "non-breaking", "annotation", "unclassified"],
			hideUnchanged: false,
			syncScroll: true,
			syncFolds: true,
			syncSelection: true,
		};

		let result = defaultConfig;
		for (const val of values) {
			result = Object.assign({}, result, val);
		}
		return result;
	},
});

/** Get diff state from editor state */
export function getDiffState(state: { field: <T>(field: StateField<T>) => T }): DiffEditorState {
	return state.field(diffStateField);
}

/** Get diff config from editor state */
export function getDiffConfig(state: { facet: <T>(facet: FacetReader<T>) => T }): DiffConfig {
	return state.facet(diffConfigFacet);
}
