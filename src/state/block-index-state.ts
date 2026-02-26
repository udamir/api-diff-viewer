/**
 * BlockTreeIndex StateField — Makes the block tree index available
 * as a first-class CodeMirror state, consumed by all extensions.
 */

import { StateEffect, StateField } from "@codemirror/state";
import type { BlockTreeIndex } from "../utils/block-index";

/** Effect to set the block tree index */
export const setBlockTreeIndexEffect = StateEffect.define<BlockTreeIndex>();

/** StateField storing the block tree index */
export const blockTreeIndexField = StateField.define<BlockTreeIndex | null>({
	create() {
		return null;
	},
	update(index, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setBlockTreeIndexEffect)) {
				return effect.value;
			}
		}
		return index;
	},
});

/** Safe accessor */
export function getBlockTreeIndex(state: { field: <T>(f: StateField<T>) => T }): BlockTreeIndex | null {
	try {
		return state.field(blockTreeIndexField);
	} catch {
		return null;
	}
}
