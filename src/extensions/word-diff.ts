/**
 * Word-Level Diff Highlighting Extension
 *
 * Provides character/word-level highlighting within modified lines
 * to show exactly what changed between before and after versions.
 */

import { type Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { diffChars, diffWords } from "diff";
import type { LineMapping } from "../types";

/** Word diff data for a line */
export interface WordDiffData {
	lineNumber: number;
	ranges: WordDiffRange[];
}

/** A range within a line that was changed */
export interface WordDiffRange {
	from: number; // Offset from line start
	to: number;
	type: "added" | "removed";
}

/** Effect to set word diff data (replaces all) */
export const setWordDiffDataEffect = StateEffect.define<WordDiffData[]>();

/** Effect to extend word diff data (appends new entries) */
export const extendWordDiffDataEffect = StateEffect.define<WordDiffData[]>();

/** State field for word diff data */
export const wordDiffDataField = StateField.define<WordDiffData[]>({
	create() {
		return [];
	},
	update(data, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setWordDiffDataEffect)) {
				return effect.value;
			}
			if (effect.is(extendWordDiffDataEffect)) {
				// Merge new data with existing, avoiding duplicates by line number
				const existingLines = new Set(data.map((d) => d.lineNumber));
				const newEntries = effect.value.filter((d) => !existingLines.has(d.lineNumber));
				return [...data, ...newEntries];
			}
		}
		return data;
	},
});

/** Decorations for word-level changes */
const addedTextDecoration = Decoration.mark({ class: "cm-diff-word-added" });
const removedTextDecoration = Decoration.mark({ class: "cm-diff-word-removed" });

/** Build word diff decorations */
function buildWordDiffDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const data = view.state.field(wordDiffDataField, false) || [];
	const doc = view.state.doc;

	for (const lineData of data) {
		if (lineData.lineNumber > 0 && lineData.lineNumber <= doc.lines) {
			try {
				const line = doc.line(lineData.lineNumber);

				for (const range of lineData.ranges) {
					const from = line.from + range.from;
					const to = line.from + range.to;

					// Ensure ranges are within bounds
					if (from >= line.from && to <= line.to && from < to) {
						const decoration = range.type === "added" ? addedTextDecoration : removedTextDecoration;
						builder.add(from, to, decoration);
					}
				}
			} catch {
				// Line doesn't exist
			}
		}
	}

	return builder.finish();
}

/** View plugin for word diff decorations */
const wordDiffPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildWordDiffDecorations(view);
		}

		update(update: ViewUpdate) {
			if (
				update.docChanged ||
				update.transactions.some((tr) =>
					tr.effects.some((e) => e.is(setWordDiffDataEffect) || e.is(extendWordDiffDataEffect))
				)
			) {
				this.decorations = buildWordDiffDecorations(update.view);
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

/**
 * Compute the length of the common leading whitespace prefix.
 */
function commonIndentLength(a: string, b: string): number {
	const len = Math.min(a.length, b.length);
	let i = 0;
	while (i < len && a[i] === " " && b[i] === " ") i++;
	return i;
}

/**
 * Compute word-level diff between two strings.
 * Returns ranges of changes within each string.
 *
 * Strips common leading whitespace before diffing so that
 * `diffWords` doesn't treat the indent as part of a changed token
 * when only a single word follows (e.g. "    photoUrl:" vs "    imageUrl:").
 */
export function computeWordDiff(
	before: string,
	after: string,
	mode: "word" | "char" = "word"
): { beforeRanges: WordDiffRange[]; afterRanges: WordDiffRange[] } {
	const skip = mode === "word" ? commonIndentLength(before, after) : 0;
	const beforeTrimmed = before.slice(skip);
	const afterTrimmed = after.slice(skip);

	const diffFn = mode === "word" ? diffWords : diffChars;
	const changes = diffFn(beforeTrimmed, afterTrimmed);

	const beforeRanges: WordDiffRange[] = [];
	const afterRanges: WordDiffRange[] = [];

	let beforeOffset = skip;
	let afterOffset = skip;

	for (const change of changes) {
		const length = change.value.length;

		if (change.removed) {
			// Removed from before
			beforeRanges.push({
				from: beforeOffset,
				to: beforeOffset + length,
				type: "removed",
			});
			beforeOffset += length;
		} else if (change.added) {
			// Added to after
			afterRanges.push({
				from: afterOffset,
				to: afterOffset + length,
				type: "added",
			});
			afterOffset += length;
		} else {
			// Unchanged - advance both offsets
			beforeOffset += length;
			afterOffset += length;
		}
	}

	return { beforeRanges, afterRanges };
}

/**
 * Build word diff data for modified lines.
 *
 * Handles two cases:
 * 1. Lines with type 'modified' (both sides on the same row)
 * 2. Paired remove+add lines linked by pairId (split rows for height alignment)
 *
 * When fromLine/toLine are provided, only processes lines within that range
 * (for lazy/viewport-based loading).
 *
 * @param lineMap - Line mappings with before/after correspondence
 * @param beforeLines - Content of before lines
 * @param afterLines - Content of after lines
 * @param side - Which side to generate data for
 * @param mode - Diff mode ('word' or 'char')
 * @param fromLine - Start line number (1-indexed, inclusive). Default: 1
 * @param toLine - End line number (1-indexed, inclusive). Default: all lines
 */
export function buildWordDiffData(
	lineMap: LineMapping[],
	beforeLines: string[],
	afterLines: string[],
	side: "before" | "after",
	mode: "word" | "char" = "word",
	fromLine?: number,
	toLine?: number
): WordDiffData[] {
	const result: WordDiffData[] = [];

	// Build pairId index: pairId → { removedIdx, addedIdx }
	const pairMap = new Map<string, { removedIdx: number; addedIdx: number }>();
	for (let i = 0; i < lineMap.length; i++) {
		const m = lineMap[i];
		if (!m.pairId) continue;
		const entry = pairMap.get(m.pairId) || { removedIdx: -1, addedIdx: -1 };
		if (m.type === "removed") entry.removedIdx = i;
		else if (m.type === "added") entry.addedIdx = i;
		pairMap.set(m.pairId, entry);
	}

	const startIdx = fromLine !== undefined ? Math.max(0, fromLine - 1) : 0;
	const endIdx = toLine !== undefined ? Math.min(lineMap.length, toLine) : lineMap.length;

	for (let i = startIdx; i < endIdx; i++) {
		const mapping = lineMap[i];

		// Case 1: Same-row modified lines (inline mode)
		if (mapping.type === "modified") {
			const beforeLine = beforeLines[i] || "";
			const afterLine = afterLines[i] || "";

			if (!beforeLine || !afterLine || beforeLine === afterLine) continue;

			const { beforeRanges, afterRanges } = computeWordDiff(beforeLine, afterLine, mode);

			const ranges = side === "before" ? beforeRanges : afterRanges;
			if (ranges.length > 0) {
				result.push({ lineNumber: i + 1, ranges });
			}
			continue;
		}

		// Case 2: Paired remove+add lines (split rows for height alignment)
		if (!mapping.pairId) continue;
		const pair = pairMap.get(mapping.pairId);
		if (!pair || pair.removedIdx < 0 || pair.addedIdx < 0) continue;

		// Before side: highlight removed words on the "removed" row
		if (side === "before" && mapping.type === "removed") {
			const beforeLine = beforeLines[pair.removedIdx] || "";
			const afterLine = afterLines[pair.addedIdx] || "";

			if (!beforeLine || !afterLine || beforeLine === afterLine) continue;

			const { beforeRanges } = computeWordDiff(beforeLine, afterLine, mode);
			if (beforeRanges.length > 0) {
				result.push({ lineNumber: i + 1, ranges: beforeRanges });
			}
		}

		// After side: highlight added words on the "added" row
		if (side === "after" && mapping.type === "added") {
			const beforeLine = beforeLines[pair.removedIdx] || "";
			const afterLine = afterLines[pair.addedIdx] || "";

			if (!beforeLine || !afterLine || beforeLine === afterLine) continue;

			const { afterRanges } = computeWordDiff(beforeLine, afterLine, mode);
			if (afterRanges.length > 0) {
				result.push({ lineNumber: i + 1, ranges: afterRanges });
			}
		}
	}

	return result;
}

/**
 * Build word diff data from before/after content strings for modified lines.
 * Uses a simpler approach when we have line-by-line content.
 */
export function buildWordDiffDataFromContent(
	lineMap: LineMapping[],
	beforeContent: string,
	afterContent: string,
	side: "before" | "after",
	mode: "word" | "char" = "word"
): WordDiffData[] {
	const beforeLines = beforeContent.split("\n");
	const afterLines = afterContent.split("\n");

	return buildWordDiffData(lineMap, beforeLines, afterLines, side, mode);
}

/**
 * Build word diff data for inline/unified view where modified lines
 * show inline changes. Uses beforeContentMap from generateUnifiedContentFromDiff.
 *
 * @param lines - The unified content lines
 * @param lineMap - Line mappings
 * @param beforeContentMap - Map of line index to before content for modified lines
 * @param mode - Diff mode ('word' or 'char')
 */
export function buildInlineWordDiffData(
	lines: string[],
	lineMap: LineMapping[],
	beforeContentMap: Map<number, string>,
	mode: "word" | "char" = "word"
): WordDiffData[] {
	const result: WordDiffData[] = [];

	for (let i = 0; i < lineMap.length; i++) {
		const mapping = lineMap[i];

		// Only process modified lines that have before content
		if (mapping.type !== "modified") continue;

		const beforeContent = beforeContentMap.get(i);
		if (beforeContent === undefined) continue;

		const afterContent = lines[i] || "";

		// Skip if they're identical
		if (beforeContent === afterContent) continue;

		const { afterRanges } = computeWordDiff(beforeContent, afterContent, mode);

		if (afterRanges.length > 0) {
			result.push({
				lineNumber: i + 1,
				ranges: afterRanges,
			});
		}
	}

	return result;
}

/** Theme for word-level diff highlighting */
export const wordDiffTheme = EditorView.baseTheme({
	".cm-diff-word-added": {
		backgroundColor: "var(--diff-word-added-bg, rgba(46, 160, 67, 0.4))",
		borderRadius: "2px",
		padding: "0 1px",
	},
	".cm-diff-word-removed": {
		backgroundColor: "var(--diff-word-removed-bg, rgba(248, 81, 73, 0.4))",
		textDecoration: "line-through",
		textDecorationColor: "var(--diff-word-removed-strike, rgba(248, 81, 73, 0.8))",
		borderRadius: "2px",
		padding: "0 1px",
	},
	// Dark mode
	"&dark .cm-diff-word-added": {
		backgroundColor: "var(--diff-word-added-bg, rgba(46, 160, 67, 0.5))",
	},
	"&dark .cm-diff-word-removed": {
		backgroundColor: "var(--diff-word-removed-bg, rgba(248, 81, 73, 0.5))",
		textDecorationColor: "var(--diff-word-removed-strike, rgba(248, 81, 73, 0.9))",
	},
});

/**
 * Create just the word diff state field (for base extensions).
 * Use this when the state field needs to persist across compartment reconfigurations.
 */
export function wordDiffStateField(): Extension {
	return wordDiffDataField;
}

/**
 * Create just the word diff plugin and theme (for compartments).
 * Use this with wordDiffStateField() when dynamic reconfiguration is needed.
 */
export function wordDiffPluginOnly(): Extension {
	return [wordDiffPlugin, wordDiffTheme];
}

export { diffWords, diffChars };
