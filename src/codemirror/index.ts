/**
 * CodeMirror-based Diff Viewer
 *
 * This module provides CodeMirror 6 extensions
 * for rendering API diff visualizations.
 */

// Core types
export type {
  DiffData,
  DiffConfig,
  DiffCoordinator,
  DiffPairResult,
  NavigationAPI,
  NavigationOptions,
  ChangeSummary,
  LineMapping,
  BlockMapping,
  DiffDecoration,
  WordDiff,
  DiffThemeColors,
  SyncState,
  SyncManagerOptions,
  AlignedContent,
  CoordinatorOptions,
} from './types'

export { defaultDiffConfig } from './types'

// State management
export {
  diffStateField,
  diffConfigFacet,
  getDiffState,
  getDiffConfig,
  setDiffDataEffect,
  setSelectedBlockEffect,
  toggleBlockExpandedEffect,
  setExpandedBlocksEffect,
  setFiltersEffect,
  setDisplayModeEffect,
  setFormatEffect,
  setSideEffect,
} from './state/diff-state'

export type { DiffEditorState } from './state/diff-state'

// Extensions
export {
  diffDecorations,
  diffDecorationsTheme,
  diffDecorationsPlugin,
  buildDecorations,
} from './extensions/diff-decorations'

export {
  diffGutter,
  diffGutterTheme,
  DiffGutterMarker,
  buildGutterMarkers,
} from './extensions/diff-gutter'

export {
  spacerDecorations,
  spacerDecorationsTheme,
  setSpacerLinesEffect,
  spacerLinesField,
} from './extensions/spacer-decorations'

export {
  alignedDecorations,
  alignedDecorationsTheme,
  setLineMappingsEffect,
  setEditorSideEffect,
  lineMappingsField,
  createSpacerAwareLineNumbers,
  LINE_HEIGHT_PX,
} from './extensions/aligned-decorations'

// Folding extension
export {
  diffFolding,
  diffFoldingTheme,
  diffFoldKeymap,
  foldableRangesField,
  setFoldableRangesEffect,
  toggleFoldEffect,
  expandAllEffect,
  collapseAllEffect,
  autoExpandChangesEffect,
  buildFoldableRanges,
  toggleFoldAtRange,
  FoldWidget,
  FoldGutterMarker,
} from './extensions/diff-folding'

export type { FoldableRange } from './extensions/diff-folding'

// Change badges extension
export {
  changeBadges,
  changeBadgesTheme,
  badgeDataField,
  setBadgeDataEffect,
  buildBadgeData,
  ChangeBadgeWidget,
} from './extensions/change-badges'

export type { BadgeData } from './extensions/change-badges'

// Word-level diff extension
export {
  wordDiff,
  wordDiffTheme,
  wordDiffDataField,
  setWordDiffDataEffect,
  computeWordDiff,
  buildWordDiffData,
  buildWordDiffDataFromContent,
  buildInlineWordDiffData,
} from './extensions/word-diff'

export type { WordDiffData, WordDiffRange } from './extensions/word-diff'

// Inline word diff extension (for unified view)
export {
  inlineWordDiff,
  inlineWordDiffTheme,
  inlineWordDiffField,
  setInlineWordDiffEffect,
  inlineWordDiffConfigField,
  setInlineWordDiffConfigEffect,
  buildInlineWordDiffLines,
  RemovedTextWidget,
} from './extensions/inline-word-diff'

export type { InlineWordDiffLine, InlineWordDiffConfig } from './extensions/inline-word-diff'

// Sync utilities
export {
  generateAlignedContent,
  generateAlignedContentFromDiff,
  generateUnifiedContentFromDiff,
  alignmentToContent,
  SPACER_LINE,
} from './sync/visual-alignment'

export type { AlignmentResult, UnifiedResult, UnifiedContentOptions } from './sync/visual-alignment'

// Fold sync
export {
  foldSync,
  setupFoldSync,
  disableFoldSyncEffect,
} from './sync/fold-sync'

export type { FoldSyncOptions } from './sync/fold-sync'

// Themes
export {
  diffTheme,
  diffThemeLight,
  diffThemeDark,
  detectDarkMode,
  DiffThemeManager,
  themeCompartment,
  lightColors,
  darkColors,
} from './themes/diff-theme'

// Navigation
export { createNavigationAPI, NavigationAPIImpl } from './navigation/navigation-api'

// Coordinator
export { createCoordinator, DiffCoordinatorImpl } from './coordinator'

// Factory functions
export { diff, createDiffPair, createUnifiedDiff } from './factory'
