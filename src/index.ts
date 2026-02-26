/**
 * api-diff-viewer — Framework-free CodeMirror-based API diff viewer
 *
 * Public API exports for consumers.
 */

// ── Fold utilities ──
export { foldAllInView, unfoldAllInView } from "./coordinator";
// ── Diff builder ──
export { buildDiffBlock } from "./diff-builder";
export type { FormatContext, FormatStrategy } from "./diff-builder/builder";
export { valueTokens } from "./diff-builder/builder";
export type { LineDiff, TokenTag, TokenType } from "./diff-builder/common";
export { DiffBlockData, DiffLineData, Token } from "./diff-builder/common";
// ── Main API ──
export * from "./diff-viewer";
// ── Extensions ──
export * from "./extensions";
export type { FoldPlaceholderData } from "./extensions/fold-placeholder";
// ── Fold placeholder ──
export { createFoldPlaceholder, prepareFoldPlaceholder } from "./extensions/fold-placeholder";
// ── Navigation ──
export { createNavigationAPI } from "./navigation/navigation-api";
export type { DiffEditorState } from "./state/diff-state";
// ── State management ──
export {
	diffConfigFacet,
	diffStateField,
	getDiffConfig,
	getDiffState,
	setDiffDataEffect,
	setDisplayModeEffect,
	setExpandedBlocksEffect,
	setFiltersEffect,
	setFormatEffect,
	setSelectedBlockEffect,
	toggleBlockExpandedEffect,
} from "./state/diff-state";
export { setupFoldSync } from "./sync/fold-sync";
export type { HeightSyncHandle } from "./sync/height-sync";
export { setupHeightSync } from "./sync/height-sync";
export type { AlignmentResult, UnifiedContentOptions, UnifiedResult } from "./sync/visual-alignment";
// ── Sync utilities ──
export {
	generateAlignedContentFromDiff,
	generateUnifiedContentFromDiff,
	SPACER_LINE,
	tokensToStringBatch,
} from "./sync/visual-alignment";
// ── Themes ──
export {
	DiffThemeManager,
	darkColors,
	diffTheme,
	diffThemeDark,
	diffThemeLight,
	lightColors,
} from "./themes";
export type {
	AlignedContent,
	BlockMapping,
	ChangeSummary,
	ChildKeyInfo,
	DiffConfig,
	DiffData,
	DiffDecoration,
	DiffThemeColors,
	FindPathsOptions,
	JsonArray,
	JsonObject,
	JsonPrimitive,
	JsonValue,
	LineMapping,
	MergedArray,
	MergedDocument,
	MergedObject,
	NavigationAPI,
	NavigationOptions,
	PathSearchResult,
	SyncState,
	WordDiff,
} from "./types";
// ── Core types ──
export { defaultDiffConfig } from "./types";
// ── Event system ──
export { TypedEventEmitter } from "./utils/events";
export type { DiffPath } from "./utils/path";
// ── Path utilities ──
export {
	decodeSegment,
	encodeSegment,
	formatPath,
	getAncestorBlockIds,
	parsePath,
	resolvePathToBlock,
} from "./utils/path";

// ── Worker manager ──
export { DiffWorkerManager } from "./worker/worker-manager";
