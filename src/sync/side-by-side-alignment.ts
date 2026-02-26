/**
 * Side-by-Side Alignment for Diff View
 *
 * Generates aligned content for before/after editors,
 * inserting spacer lines to keep corresponding content at the same
 * vertical position.
 */

import type { DiffBlockData } from "../diff-builder/common";
import type { AlignedContent, LineMapping } from "../types";
import {
	type AlignmentResult,
	collectDiffLines,
	type DiffLineEntry,
	getLineVisibility,
	SPACER_LINE,
	tokensToString,
} from "./alignment-types";

/**
 * Generates aligned content for side-by-side view from diff blocks.
 *
 * Uses token tags to determine which content appears on which side:
 * - Tokens tagged 'before' only: appear only on before side
 * - Tokens tagged 'after' only: appear only on after side
 * - Untagged tokens: appear on both sides
 *
 * @param diffBlocks - Diff block data array
 * @param format - Output format (for future use)
 * @returns Aligned content with spacer lines inserted
 */
export function generateAlignedContentFromDiff(
	diffBlocks: DiffBlockData[],
	format: "json" | "yaml",
	options?: { wordDiffMode?: "word" | "char" | "none" }
): AlignmentResult {
	// Collect all diff lines in order
	const diffLines: DiffLineEntry[] = [];
	for (const block of diffBlocks) {
		diffLines.push(...collectDiffLines(block));
	}

	const beforeLines: string[] = [];
	const afterLines: string[] = [];
	const lineMap: LineMapping[] = [];
	const beforeSpacers = new Set<number>();
	const afterSpacers = new Set<number>();
	const blockLineRanges = new Map<string, { start: number; end: number }>();

	// For JSON format, add opening brace
	if (format === "json") {
		beforeLines.push("{");
		afterLines.push("{");
		lineMap.push({
			beforeLine: 1,
			afterLine: 1,
			type: "unchanged",
		});
	}

	let alignedLineIndex = format === "json" ? 1 : 0;

	// Extra indent for JSON format (to account for the wrapping braces)
	const extraIndent = format === "json" ? 2 : 0;

	const wordDiffMode = options?.wordDiffMode ?? "word";

	/** Update blockLineRanges for a given blockId at the current aligned line index */
	function trackBlockLineRange(blockId: string | undefined, lineIndex: number) {
		if (!blockId) return;
		const lineNum = lineIndex + 1; // 1-based
		const existing = blockLineRanges.get(blockId);
		if (!existing) {
			blockLineRanges.set(blockId, { start: lineNum, end: lineNum });
		} else {
			existing.end = lineNum;
		}
		// Propagate to ancestors
		let parentId = blockId;
		while (true) {
			const slashIdx = parentId.lastIndexOf("/");
			if (slashIdx <= 0) break;
			parentId = parentId.substring(0, slashIdx);
			const parentRange = blockLineRanges.get(parentId);
			if (parentRange) {
				if (lineNum > parentRange.end) parentRange.end = lineNum;
				if (lineNum < parentRange.start) parentRange.start = lineNum;
			} else {
				blockLineRanges.set(parentId, { start: lineNum, end: lineNum });
			}
		}
	}

	// Process each diff line
	for (const line of diffLines) {
		const action = line.diff?.action;

		// When wordDiffMode is 'none', split replace/rename into separate remove + add lines.
		// Each row gets identical text on both sides (spacer uses opposite content),
		// guaranteeing identical word-wrap height regardless of content differences.
		// A shared pairId links the two rows so word-diff can reconstruct the pairing.
		if (wordDiffMode === "none" && (action === "replace" || action === "rename")) {
			const actualBeforeContent = tokensToString(line, "before", extraIndent);
			const actualAfterContent = tokensToString(line, "after", extraIndent);
			const pairId = line.id || `pair-${alignedLineIndex}`;

			// Emit removed line: content on before side, spacer on after side
			beforeLines.push(actualBeforeContent);
			afterLines.push(actualBeforeContent || SPACER_LINE); // match wrap height
			afterSpacers.add(alignedLineIndex);
			lineMap.push({
				beforeLine: alignedLineIndex + 1,
				afterLine: null,
				type: "removed",
				blockId: line.id,
				diffType: line.diff?.type,
				isChangeRoot: line._isChangeRoot,
				pairId,
			});
			trackBlockLineRange(line.id, alignedLineIndex);
			alignedLineIndex++;

			// Emit added line: spacer on before side, content on after side
			beforeLines.push(actualAfterContent || SPACER_LINE); // match wrap height
			afterLines.push(actualAfterContent);
			beforeSpacers.add(alignedLineIndex);
			lineMap.push({
				beforeLine: null,
				afterLine: alignedLineIndex + 1,
				type: "added",
				blockId: line.id,
				diffType: line.diff?.type,
				isChangeRoot: line._isChangeRoot,
				pairId,
			});
			trackBlockLineRange(line.id, alignedLineIndex);
			alignedLineIndex++;

			continue;
		}

		const visibility = getLineVisibility(line);

		// Get the actual content for each side
		const actualBeforeContent = tokensToString(line, "before", extraIndent);
		const actualAfterContent = tokensToString(line, "after", extraIndent);

		// For spacer lines, use content from the OPPOSITE side so word-wrap matches
		// The content will be made invisible via CSS
		let beforeContent: string;
		let afterContent: string;

		if (visibility.before) {
			beforeContent = actualBeforeContent;
		} else {
			// Spacer on before side - use after content for matching wrap height
			beforeContent = actualAfterContent || SPACER_LINE;
		}

		if (visibility.after) {
			afterContent = actualAfterContent;
		} else {
			// Spacer on after side - use before content for matching wrap height
			afterContent = actualBeforeContent || SPACER_LINE;
		}

		beforeLines.push(beforeContent);
		afterLines.push(afterContent);

		// Track spacers
		if (!visibility.before) {
			beforeSpacers.add(alignedLineIndex);
		}
		if (!visibility.after) {
			afterSpacers.add(alignedLineIndex);
		}

		// Build line map
		let type: "added" | "removed" | "modified" | "unchanged" = "unchanged";
		if (action === "add") type = "added";
		else if (action === "remove") type = "removed";
		else if (action === "replace" || action === "rename") type = "modified";

		lineMap.push({
			beforeLine: visibility.before ? alignedLineIndex + 1 : null,
			afterLine: visibility.after ? alignedLineIndex + 1 : null,
			type,
			blockId: line.id,
			diffType: line.diff?.type,
			isChangeRoot: line._isChangeRoot,
		});

		trackBlockLineRange(line.id, alignedLineIndex);
		alignedLineIndex++;
	}

	// For JSON format, add closing brace
	if (format === "json") {
		beforeLines.push("}");
		afterLines.push("}");
		lineMap.push({
			beforeLine: alignedLineIndex + 1,
			afterLine: alignedLineIndex + 1,
			type: "unchanged",
		});
	}

	// Validate that all arrays have the same length
	if (beforeLines.length !== afterLines.length || beforeLines.length !== lineMap.length) {
		console.error("Alignment mismatch:", {
			beforeLines: beforeLines.length,
			afterLines: afterLines.length,
			lineMap: lineMap.length,
		});
	}

	// Check for embedded newlines that would cause document line count mismatch
	const beforeNewlines = beforeLines.filter((l) => l.includes("\n")).length;
	const afterNewlines = afterLines.filter((l) => l.includes("\n")).length;
	if (beforeNewlines > 0 || afterNewlines > 0) {
		console.error("Lines contain embedded newlines:", { beforeNewlines, afterNewlines });
	}

	return {
		beforeLines,
		afterLines,
		lineMap,
		beforeSpacers,
		afterSpacers,
		blockLineRanges,
	};
}

/**
 * Creates aligned content strings from alignment result
 */
export function alignmentToContent(alignment: AlignmentResult): AlignedContent {
	return {
		before: alignment.beforeLines.join("\n"),
		after: alignment.afterLines.join("\n"),
		lineMap: alignment.lineMap,
	};
}
