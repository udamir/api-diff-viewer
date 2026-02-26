/**
 * Unified/Inline Alignment for Diff View
 *
 * Generates unified content that shows both before and after
 * in a single view, with removed, added, and modified lines marked.
 */

import type { DiffBlockData } from "../diff-builder/common";
import type { LineMapping } from "../types";
import {
	collectDiffLines,
	type DiffLineEntry,
	tokensToString,
	type UnifiedContentOptions,
	type UnifiedResult,
} from "./alignment-types";

/**
 * Generates unified/inline content from diff blocks.
 * Shows both before and after content in a single view:
 * - Removed lines are included and marked
 * - Added lines are included and marked
 * - Modified lines: with inlineWordDiff=true shows single line, otherwise shows remove+add
 *
 * @param diffBlocks - Diff block data array
 * @param format - Output format (for future use)
 * @param options - Generation options
 * @returns Unified content with line mappings
 */
export function generateUnifiedContentFromDiff(
	diffBlocks: DiffBlockData[],
	format: "json" | "yaml",
	options?: UnifiedContentOptions
): UnifiedResult {
	const inlineWordDiff = options?.inlineWordDiff ?? false;

	// Collect all diff lines in order
	const diffLines: DiffLineEntry[] = [];
	for (const block of diffBlocks) {
		diffLines.push(...collectDiffLines(block));
	}

	const lines: string[] = [];
	const lineMap: LineMapping[] = [];
	const beforeContentMap = new Map<number, string>();

	let lineIndex = 0;

	// For JSON format, add opening brace
	if (format === "json") {
		lines.push("{");
		lineMap.push({
			beforeLine: 1,
			afterLine: 1,
			type: "unchanged",
		});
		lineIndex++;
	}

	// Extra indent for JSON format (to account for the wrapping braces)
	const extraIndent = format === "json" ? 2 : 0;

	// Process each diff line
	for (const line of diffLines) {
		const action = line.diff?.action;

		// Get content for both sides
		const beforeContent = tokensToString(line, "before", extraIndent);
		const afterContent = tokensToString(line, "after", extraIndent);

		// Determine the type
		let _type: "added" | "removed" | "modified" | "unchanged" = "unchanged";
		if (action === "add") _type = "added";
		else if (action === "remove") _type = "removed";
		else if (action === "replace" || action === "rename") _type = "modified";

		// For unified view, show appropriate content based on action
		if (action === "remove") {
			// Show removed content
			lines.push(beforeContent);
			lineMap.push({
				beforeLine: lineIndex + 1,
				afterLine: null,
				type: "removed",
				blockId: line.id,
				diffType: line.diff?.type,
				isChangeRoot: line._isChangeRoot,
			});
			lineIndex++;
		} else if (action === "add") {
			// Show added content
			lines.push(afterContent);
			lineMap.push({
				beforeLine: null,
				afterLine: lineIndex + 1,
				type: "added",
				blockId: line.id,
				diffType: line.diff?.type,
				isChangeRoot: line._isChangeRoot,
			});
			lineIndex++;
		} else if (action === "replace" || action === "rename") {
			if (inlineWordDiff) {
				// Show single line with after content, store before for word diff
				lines.push(afterContent);
				beforeContentMap.set(lineIndex, beforeContent);
				lineMap.push({
					beforeLine: lineIndex + 1,
					afterLine: lineIndex + 1,
					type: "modified",
					blockId: line.id,
					diffType: line.diff?.type,
					isChangeRoot: line._isChangeRoot,
				});
				lineIndex++;
			} else {
				// Traditional mode: show both old and new on separate lines
				// First show the removed (old) version
				lines.push(beforeContent);
				lineMap.push({
					beforeLine: lineIndex + 1,
					afterLine: null,
					type: "removed",
					blockId: line.id,
					diffType: line.diff?.type,
					isChangeRoot: line._isChangeRoot,
				});
				lineIndex++;

				// Then show the added (new) version
				lines.push(afterContent);
				lineMap.push({
					beforeLine: null,
					afterLine: lineIndex + 1,
					type: "added",
					blockId: line.id,
					diffType: line.diff?.type,
					isChangeRoot: line._isChangeRoot,
				});
				lineIndex++;
			}
		} else {
			// Unchanged - show as-is
			lines.push(afterContent);
			lineMap.push({
				beforeLine: lineIndex + 1,
				afterLine: lineIndex + 1,
				type: "unchanged",
				blockId: line.id,
				diffType: line.diff?.type,
				isChangeRoot: line._isChangeRoot,
			});
			lineIndex++;
		}
	}

	// For JSON format, add closing brace
	if (format === "json") {
		lines.push("}");
		lineMap.push({
			beforeLine: lineIndex + 1,
			afterLine: lineIndex + 1,
			type: "unchanged",
		});
	}

	return {
		lines,
		lineMap,
		beforeContentMap: beforeContentMap.size > 0 ? beforeContentMap : undefined,
	};
}
