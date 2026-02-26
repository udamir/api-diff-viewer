import type { EditorView } from "@codemirror/view";
import type { ActionType, DiffType } from "api-smart-diff";
import type { DiffBlockData } from "../diff-builder/common";

/** Line mapping between before and after documents */
export interface LineMapping {
	beforeLine: number | null;
	afterLine: number | null;
	type: "unchanged" | "modified" | "added" | "removed";
	blockId?: string;
}

/** Block mapping for API structure elements */
export interface BlockMapping {
	id: string;
	beforeRange: { from: number; to: number } | null;
	afterRange: { from: number; to: number } | null;
	children: BlockMapping[];
}

/** Diff data computed by api-smart-diff */
export interface DiffData {
	blocks: DiffBlockData[];
	lineMap: LineMapping[];
	blockMap: BlockMapping[];
}

/** Configuration options for the diff extension */
export interface DiffConfig {
	side: "before" | "after" | "unified";
	format: "json" | "yaml";
	showGutter: boolean;
	showBadges: boolean;
	showMinimap: boolean;
	enableFolding: boolean;
	enableSearch: boolean;
	filters: DiffType[];
	hideUnchanged: boolean;
	pairedEditor?: EditorView;
	syncScroll: boolean;
	syncFolds: boolean;
	syncSelection: boolean;
	onBlockSelect?: (blockId: string) => void;
}

/** Default configuration values */
export const defaultDiffConfig: DiffConfig = {
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

/** Coordinator options for dual editor sync */
export interface CoordinatorOptions {
	syncScroll?: boolean;
	syncFolds?: boolean;
	syncSelection?: boolean;
	scrollStrategy?: "ratio" | "line" | "block";
}

/** Result of creating a diff pair */
export interface DiffPairResult {
	before: EditorView;
	after: EditorView;
	coordinator: DiffCoordinator;
	destroy: () => void;
}

/** Navigation options for scrolling to blocks */
export interface NavigationOptions {
	behavior?: "smooth" | "instant";
	align?: "start" | "center" | "end";
	highlight?: boolean;
	expand?: boolean;
}

/** Summary of changes in the diff */
export interface ChangeSummary {
	total: number;
	breaking: number;
	nonBreaking: number;
	annotation: number;
	unclassified: number;
	byPath: Map<string, { type: DiffType; count: number }[]>;
}

/** Navigation API for programmatic control */
export interface NavigationAPI {
	goToBlock(blockId: string, options?: NavigationOptions): void;
	goToNextChange(filter?: DiffType[]): DiffBlockData | null;
	goToPrevChange(filter?: DiffType[]): DiffBlockData | null;
	goToNextBreaking(): DiffBlockData | null;
	goToPrevBreaking(): DiffBlockData | null;
	goToLine(line: number, side?: "before" | "after"): void;

	getBlocks(): DiffBlockData[];
	getChangedBlocks(): DiffBlockData[];
	getBlocksByType(types: DiffType[]): DiffBlockData[];
	getVisibleBlocks(): DiffBlockData[];
	getCurrentBlock(): DiffBlockData | null;
	findBlock(blockId: string): DiffBlockData | null;

	getChangeSummary(): ChangeSummary;

	onBlockChange(callback: (block: DiffBlockData | null) => void): () => void;
	onVisibleBlocksChange(callback: (blocks: DiffBlockData[]) => void): () => void;
}

/** Coordinator for dual editor synchronization */
export interface DiffCoordinator {
	goToBlock(blockId: string, options?: NavigationOptions): void;
	goToNextChange(filter?: DiffType[]): DiffBlockData | null;
	goToPrevChange(filter?: DiffType[]): DiffBlockData | null;

	expandAll(): void;
	collapseAll(): void;
	toggleBlock(blockId: string): void;

	updateDiffData(newData: DiffData): void;

	readonly navigation: NavigationAPI;
	readonly beforeView: EditorView;
	readonly afterView: EditorView;

	destroy(): void;
}

/** Diff decoration for visual highlighting */
export interface DiffDecoration {
	from: number;
	to: number;
	type: DiffType;
	action: ActionType;
	side: "before" | "after";
}

/** Word-level diff result */
export interface WordDiff {
	from: number;
	to: number;
	type: "added" | "removed";
}

/** CSS variables for diff colors */
export interface DiffThemeColors {
	addedBg?: string;
	removedBg?: string;
	modifiedBg?: string;
	breakingColor?: string;
	nonBreakingColor?: string;
	annotationColor?: string;
	unclassifiedColor?: string;
	addedTextBg?: string;
	removedTextBg?: string;
	spacerBg?: string;
	spacerStripe?: string;
	correspondingHighlight?: string;
}

/** Synchronization state shared between editors */
export interface SyncState {
	lineMap: LineMapping[];
	blockMap: BlockMapping[];
	foldedBlocks: Set<string>;
	selectedBlock: string | null;
	highlightedRange: { side: "before" | "after"; from: number; to: number } | null;
}

/** Options for synchronization manager */
export interface SyncManagerOptions {
	scrollStrategy: "ratio" | "line" | "block";
	enableFoldSync: boolean;
	enableSelectionSync: boolean;
	enableVisualAlignment: boolean;
}

/** Result of aligned content generation */
export interface AlignedContent {
	before: string;
	after: string;
	lineMap: LineMapping[];
}
