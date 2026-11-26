/**
 * Fold utilities for CodeMirror editor views.
 */

import { foldable, foldedRanges, unfoldEffect } from "@codemirror/language";
import type { StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { type FoldRange, foldRangeEffects } from "./utils/fold-ranges";

/** Unfold all folded ranges in a single editor view */
export function unfoldAllInView(view: EditorView): void {
	const folded = foldedRanges(view.state);
	const effects: StateEffect<{ from: number; to: number }>[] = [];
	folded.between(0, view.state.doc.length, (from: number, to: number) => {
		effects.push(unfoldEffect.of({ from, to }));
	});
	if (effects.length > 0) {
		view.dispatch({ effects });
	}
}

/** Fold all foldable ranges in a single editor view */
export function foldAllInView(view: EditorView): void {
	const ranges: (FoldRange | null)[] = [];
	for (let i = 1; i <= view.state.doc.lines; i++) {
		const line = view.state.doc.line(i);
		ranges.push(foldable(view.state, line.from, line.to));
	}
	const effects = foldRangeEffects(view.state, ranges);
	if (effects.length > 0) {
		view.dispatch({ effects });
	}
}
