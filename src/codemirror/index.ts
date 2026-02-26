/**
 * CodeMirror-based Diff Viewer
 *
 * This module provides CodeMirror 6 extensions
 * for rendering API diff visualizations.
 */

// Coordinator
export { createCoordinator, DiffCoordinatorImpl } from "./coordinator";
export {
	alignedDecorations,
	alignedDecorationsTheme,
	createSpacerAwareLineNumbers,
	LINE_HEIGHT_PX,
	lineMappingsField,
	setEditorSideEffect,
	setLineMappingsEffect,
} from "./extensions/aligned-decorations";
export type { BadgeData } from "./extensions/change-badges";
// Change badges extension
export {
	badgeDataField,
	buildBadgeData,
	ChangeBadgeWidget,
	changeBadges,
	changeBadgesTheme,
	setBadgeDataEffect,
} from "./extensions/change-badges";

// Extensions
export {
	buildDecorations,
	diffDecorations,
	diffDecorationsPlugin,
	diffDecorationsTheme,
} from "./extensions/diff-decorations";
export type { FoldableRange } from "./extensions/diff-folding";
// Folding extension
export {
	autoExpandChangesEffect,
	buildFoldableRanges,
	collapseAllEffect,
	diffFolding,
	diffFoldingTheme,
	diffFoldKeymap,
	expandAllEffect,
	FoldGutterMarker,
	FoldWidget,
	foldableRangesField,
	setFoldableRangesEffect,
	toggleFoldAtRange,
	toggleFoldEffect,
} from "./extensions/diff-folding";
export {
	buildGutterMarkers,
	DiffGutterMarker,
	diffGutter,
	diffGutterTheme,
} from "./extensions/diff-gutter";
export type { InlineWordDiffConfig, InlineWordDiffLine } from "./extensions/inline-word-diff";
// Inline word diff extension (for unified view)
export {
	buildInlineWordDiffLines,
	inlineWordDiff,
	inlineWordDiffConfigField,
	inlineWordDiffField,
	inlineWordDiffTheme,
	RemovedTextWidget,
	setInlineWordDiffConfigEffect,
	setInlineWordDiffEffect,
} from "./extensions/inline-word-diff";
export {
	setSpacerLinesEffect,
	spacerDecorations,
	spacerDecorationsTheme,
	spacerLinesField,
} from "./extensions/spacer-decorations";
export type { WordDiffData, WordDiffRange } from "./extensions/word-diff";

// Word-level diff extension
export {
	buildInlineWordDiffData,
	buildWordDiffData,
	buildWordDiffDataFromContent,
	computeWordDiff,
	setWordDiffDataEffect,
	wordDiff,
	wordDiffDataField,
	wordDiffTheme,
} from "./extensions/word-diff";
// Factory functions
export { createDiffPair, createUnifiedDiff, diff } from "./factory";
// Navigation
export { createNavigationAPI, NavigationAPIImpl } from "./navigation/navigation-api";
export type { DiffEditorState } from "./state/diff-state";
// State management
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
	setSideEffect,
	toggleBlockExpandedEffect,
} from "./state/diff-state";
export type { FoldSyncOptions } from "./sync/fold-sync";

// Fold sync
export {
	disableFoldSyncEffect,
	foldSync,
	setupFoldSync,
} from "./sync/fold-sync";
export type { AlignmentResult, UnifiedContentOptions, UnifiedResult } from "./sync/visual-alignment";
// Sync utilities
export {
	alignmentToContent,
	generateAlignedContent,
	generateAlignedContentFromDiff,
	generateUnifiedContentFromDiff,
	SPACER_LINE,
} from "./sync/visual-alignment";
// Themes
export {
	DiffThemeManager,
	darkColors,
	detectDarkMode,
	diffTheme,
	diffThemeDark,
	diffThemeLight,
	lightColors,
	themeCompartment,
} from "./themes/diff-theme";
// Core types
export type {
	AlignedContent,
	BlockMapping,
	ChangeSummary,
	CoordinatorOptions,
	DiffConfig,
	DiffCoordinator,
	DiffData,
	DiffDecoration,
	DiffPairResult,
	DiffThemeColors,
	LineMapping,
	NavigationAPI,
	NavigationOptions,
	SyncManagerOptions,
	SyncState,
	WordDiff,
} from "./types";
export { defaultDiffConfig } from "./types";
