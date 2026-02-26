import { EditorView } from "@codemirror/view";
import type { DiffMeta, DiffType } from "api-smart-diff";
import type { DiffBlockData } from "../diff-builder/common";
import { metaKey } from "../diff-builder/common";
import { diffStateField, setSelectedBlockEffect, toggleBlockExpandedEffect } from "../state/diff-state";
import type {
	ChangeSummary,
	ChildKeyInfo,
	DiffData,
	FindPathsOptions,
	MergedDocument,
	MergedObject,
	NavigationAPI,
	NavigationOptions,
	PathSearchResult,
} from "../types";
import type { BlockTreeIndex } from "../utils/block-index";
import { getPathValue, isEmpty } from "../utils/common";
import type { DiffPath } from "../utils/path";
import { formatPath, getAncestorBlockIds, parsePath, resolvePathToBlock } from "../utils/path";

/** Implementation of the path-based Navigation API */
export class NavigationAPIImpl implements NavigationAPI {
	private beforeView: EditorView | null;
	private afterView: EditorView | null;
	private diffData: DiffData;
	private merged: MergedDocument | null;
	private currentBlockIndex: number = -1;
	private currentPath: string | null = null;
	private navigateListeners: Set<(path: string | null) => void> = new Set();
	private treeIndex: BlockTreeIndex | null = null;

	constructor(
		beforeView: EditorView | null,
		afterView: EditorView | null,
		diffData: DiffData,
		merged?: MergedDocument | null
	) {
		this.beforeView = beforeView;
		this.afterView = afterView;
		this.diffData = diffData;
		this.merged = merged ?? null;
	}

	/** Update views, data, and merged document */
	update(
		beforeView: EditorView | null,
		afterView: EditorView | null,
		diffData: DiffData,
		merged?: MergedDocument | null,
		treeIndex?: BlockTreeIndex | null
	) {
		this.beforeView = beforeView;
		this.afterView = afterView;
		this.diffData = diffData;
		if (merged !== undefined) {
			this.merged = merged ?? null;
		}
		if (treeIndex !== undefined) {
			this.treeIndex = treeIndex ?? null;
		}
	}

	/** Navigate to the next change matching the given types */
	goToNextChange(...types: DiffType[]): string | null {
		const changedBlocks = types.length > 0 ? this.getBlocksByType(types) : this.getChangedBlocks();

		if (changedBlocks.length === 0) return null;

		this.currentBlockIndex = (this.currentBlockIndex + 1) % changedBlocks.length;
		const block = changedBlocks[this.currentBlockIndex];

		this.navigateToBlock(block, { behavior: "smooth", highlight: true });
		return this.resolveBlockPath(block);
	}

	/** Navigate to the previous change matching the given types */
	goToPrevChange(...types: DiffType[]): string | null {
		const changedBlocks = types.length > 0 ? this.getBlocksByType(types) : this.getChangedBlocks();

		if (changedBlocks.length === 0) return null;

		this.currentBlockIndex = this.currentBlockIndex <= 0 ? changedBlocks.length - 1 : this.currentBlockIndex - 1;
		const block = changedBlocks[this.currentBlockIndex];

		this.navigateToBlock(block, { behavior: "smooth", highlight: true });
		return this.resolveBlockPath(block);
	}

	/** Navigate to a specific path in the document */
	goToPath(path: DiffPath, options: NavigationOptions = {}): void {
		const block = resolvePathToBlock(path, this.diffData.blocks);
		if (!block) return;

		const targetId = Array.isArray(path) ? formatPath(path) : path;

		// Update current block index in the changed blocks list
		const changedBlocks = this.getChangedBlocks();
		this.currentBlockIndex = changedBlocks.findIndex((b) => b.id === targetId);

		this.navigateToBlock(block, options);
	}

	/** Find paths whose key or value contains the search text */
	findPaths(text: string, options: FindPathsOptions = {}): PathSearchResult[] {
		if (!this.merged || !text) return [];

		const { caseSensitive = false, searchIn = "both", limit } = options;

		const results: PathSearchResult[] = [];
		const searchText = caseSensitive ? text : text.toLowerCase();

		const walk = (node: unknown, segments: string[], diffMeta?: Record<string, DiffMeta>) => {
			if (limit !== undefined && results.length >= limit) return;
			if (node === null || node === undefined) return;

			if (typeof node === "object" && !Array.isArray(node) && !(node instanceof Date)) {
				const obj = node as MergedObject;
				const childDiffMeta = obj[metaKey] as Record<string, DiffMeta> | undefined;
				const keys = Object.keys(obj).filter((k) => k !== metaKey);

				for (const key of keys) {
					if (limit !== undefined && results.length >= limit) break;

					const childSegments = [...segments, key];
					const childPath = formatPath(childSegments);
					const childDiff = childDiffMeta?.[key];

					// Check key match
					if (searchIn === "keys" || searchIn === "both") {
						const keyText = caseSensitive ? key : key.toLowerCase();
						if (keyText.includes(searchText)) {
							results.push({
								path: childPath,
								matchedText: key,
								matchLocation: "key",
								diffType: childDiff?.type,
							});
							if (limit !== undefined && results.length >= limit) return;
						}
					}

					// Check value match (only for primitive values)
					const value = obj[key];
					if (searchIn === "values" || searchIn === "both") {
						if (value !== null && value !== undefined && typeof value !== "object") {
							const valueStr = caseSensitive ? String(value) : String(value).toLowerCase();
							if (valueStr.includes(searchText)) {
								results.push({
									path: childPath,
									matchedText: String(value),
									matchLocation: "value",
									diffType: childDiff?.type,
								});
								if (limit !== undefined && results.length >= limit) return;
							}
						}
					}

					// Recurse into children
					walk(value, childSegments, childDiffMeta);
				}
			} else if (Array.isArray(node)) {
				for (let i = 0; i < node.length; i++) {
					if (limit !== undefined && results.length >= limit) break;
					walk(node[i], [...segments, String(i)], diffMeta);
				}
			}
		};

		walk(this.merged, []);
		return results;
	}

	/** Get the immediate child keys of a path */
	getChildKeys(path?: DiffPath): ChildKeyInfo[] {
		if (!this.merged) return [];

		const segments = path ? parsePath(path) : [];
		const node = segments.length > 0 ? getPathValue(this.merged as Record<string, unknown>, segments) : this.merged;

		if (!node || typeof node !== "object" || node instanceof Date) return [];

		if (Array.isArray(node)) {
			return node.map((item, i) => {
				const childSegments = [...segments, String(i)];
				const childPath = formatPath(childSegments);
				const childBlock = resolvePathToBlock(childPath, this.diffData.blocks);
				const hasChildren = typeof item === "object" && item !== null && !(item instanceof Date) && !isEmpty(item);

				return {
					key: String(i),
					path: childPath,
					hasDirectChange: false,
					hasChildren,
					changeCounts: (childBlock?.diffs ?? [0, 0, 0, 0]) as [number, number, number, number],
				};
			});
		}

		const obj = node as MergedObject;
		const diffMeta = obj[metaKey] as Record<string, DiffMeta> | undefined;
		const keys = Object.keys(obj).filter((k) => k !== metaKey);

		return keys.map((key) => {
			const childSegments = [...segments, key];
			const childPath = formatPath(childSegments);
			const childBlock = resolvePathToBlock(childPath, this.diffData.blocks);
			const diff = diffMeta?.[key];
			const value = obj[key];
			const hasChildren = typeof value === "object" && value !== null && !(value instanceof Date) && !isEmpty(value);

			return {
				key,
				path: childPath,
				hasDirectChange: !!diff,
				diffType: diff?.type,
				action: diff?.action,
				hasChildren,
				changeCounts: (childBlock?.diffs ?? [0, 0, 0, 0]) as [number, number, number, number],
			};
		});
	}

	/** Get summary of changes */
	getChangeSummary(): ChangeSummary {
		const summary: ChangeSummary = {
			total: 0,
			breaking: 0,
			nonBreaking: 0,
			annotation: 0,
			unclassified: 0,
			byPath: new Map(),
		};

		const countChanges = (blocks: DiffBlockData[], parentSubsumes: boolean) => {
			for (const block of blocks) {
				if (block.diff && !parentSubsumes) {
					summary.total++;
					switch (block.diff.type) {
						case "breaking":
							summary.breaking++;
							break;
						case "non-breaking":
							summary.nonBreaking++;
							break;
						case "annotation":
							summary.annotation++;
							break;
						case "unclassified":
							summary.unclassified++;
							break;
					}

					if (block.id) {
						const pathCounts = summary.byPath.get(block.id) || [];
						const existing = pathCounts.find((c) => c.type === block.diff?.type);
						if (existing) {
							existing.count++;
						} else {
							pathCounts.push({ type: block.diff.type, count: 1 });
						}
						summary.byPath.set(block.id, pathCounts);
					}
				}
				// Only add/remove subsume their children (count as one logical change).
				// Rename/replace don't — their children have independent changes.
				const action = block.diff?.action;
				const subsumes = parentSubsumes || action === "add" || action === "remove";
				countChanges(block.children, subsumes);
			}
		};

		countChanges(this.diffData.blocks, false);
		return summary;
	}

	/** Get the current path */
	getCurrentPath(): string | null {
		return this.currentPath;
	}

	/** Subscribe to navigation changes */
	onNavigate(callback: (path: string | null) => void): () => void {
		this.navigateListeners.add(callback);
		return () => {
			this.navigateListeners.delete(callback);
		};
	}

	// ── Internal helpers ──

	/** Get blocks with changes (have diff metadata) */
	private getChangedBlocks(): DiffBlockData[] {
		// Use index path when available
		if (this.treeIndex) {
			return this.treeIndex.changedBlocks.map((e) => e.block);
		}

		const changed: DiffBlockData[] = [];

		const collectChanged = (blocks: DiffBlockData[]) => {
			for (const block of blocks) {
				if (block.diff) {
					changed.push(block);
				}
				collectChanged(block.children);
			}
		};

		collectChanged(this.diffData.blocks);
		return changed;
	}

	/** Get blocks by diff type */
	private getBlocksByType(types: DiffType[]): DiffBlockData[] {
		// Use index path when available
		if (this.treeIndex) {
			const result: DiffBlockData[] = [];
			for (const t of types) {
				const entries = this.treeIndex.changedByType.get(t);
				if (entries) {
					for (const e of entries) result.push(e.block);
				}
			}
			return result;
		}

		return this.getChangedBlocks().filter((block) => block.diff && types.includes(block.diff.type));
	}

	/** Navigate to a block, expanding ancestors, scrolling, and highlighting */
	private navigateToBlock(block: DiffBlockData, options: NavigationOptions = {}): void {
		const { behavior = "smooth", align = "center", highlight = true } = options;

		// Expand ancestors if they are collapsed
		const blockPath = this.resolveBlockPath(block);
		if (blockPath) {
			const ancestorIds = getAncestorBlockIds(blockPath, this.diffData.blocks);
			for (const ancestorId of ancestorIds) {
				this.expandBlock(ancestorId);
			}
		}

		// Scroll to line in both editors
		const lineNum = block.index;
		if (lineNum > 0) {
			this.scrollToLine(lineNum, behavior, align);
		}

		// Highlight the nearest identifiable block
		if (highlight && blockPath) {
			this.selectBlock(blockPath);
		}

		// Update current path and notify
		this.currentPath = blockPath;
		this.notifyNavigate(blockPath);
	}

	/** Expand a block by dispatching toggleBlockExpandedEffect if it is collapsed */
	private expandBlock(blockId: string) {
		const expand = (view: EditorView | null) => {
			if (!view) return;
			try {
				const state = view.state.field(diffStateField);
				if (!state.expandedBlocks.has(blockId)) {
					view.dispatch({
						effects: toggleBlockExpandedEffect.of(blockId),
					});
				}
			} catch {
				// If state field is not available, skip
			}
		};

		expand(this.beforeView);
		expand(this.afterView);
	}

	private scrollToLine(line: number, _behavior: "smooth" | "instant", align: "start" | "center" | "end") {
		const scrollToView = (view: EditorView | null) => {
			if (!view) return;

			const doc = view.state.doc;
			if (line > 0 && line <= doc.lines) {
				const lineInfo = doc.line(line);
				view.dispatch({
					effects: EditorView.scrollIntoView(lineInfo.from, {
						y: align,
					}),
				});
			}
		};

		scrollToView(this.beforeView);
		scrollToView(this.afterView);
	}

	private selectBlock(blockId: string) {
		const select = (view: EditorView | null) => {
			if (!view) return;
			view.dispatch({
				effects: setSelectedBlockEffect.of(blockId),
			});
		};

		select(this.beforeView);
		select(this.afterView);
	}

	/**
	 * Resolve a block to its path string.
	 * For container blocks this is the block id. For leaf blocks (id = ""),
	 * walk up the block tree to find the nearest parent with an id.
	 * Uses the tree index for O(1) parent lookup when available.
	 */
	private resolveBlockPath(block: DiffBlockData): string | null {
		if (block.id) return block.id;

		// Fallback: walk the tree
		const findParentId = (blocks: DiffBlockData[]): string | null => {
			for (const b of blocks) {
				if (b.children.includes(block) && b.id) return b.id;
				const found = findParentId(b.children);
				if (found) return found;
			}
			return null;
		};

		return findParentId(this.diffData.blocks);
	}

	private notifyNavigate(path: string | null) {
		for (const listener of this.navigateListeners) {
			listener(path);
		}
	}
}

/** Create navigation API instance */
export function createNavigationAPI(
	beforeView: EditorView | null,
	afterView: EditorView | null,
	diffData: DiffData,
	merged?: MergedDocument | null
): NavigationAPI {
	return new NavigationAPIImpl(beforeView, afterView, diffData, merged);
}
