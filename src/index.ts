/**
 * api-diff-viewer — Framework-free CodeMirror-based API diff viewer
 *
 * Public API exports for consumers.
 */

// ── Main API ──
export * from './diff-viewer'

// ── Core types ──
export {
  defaultDiffConfig,
} from './types'

export type {
  JsonPrimitive,
  JsonArray,
  JsonObject,
  JsonValue,
  MergedObject,
  MergedArray,
  MergedDocument,
  LineMapping,
  BlockMapping,
  DiffData,
  DiffConfig,
  NavigationOptions,
  ChangeSummary,
  FindPathsOptions,
  PathSearchResult,
  ChildKeyInfo,
  NavigationAPI,
  DiffDecoration,
  WordDiff,
  DiffThemeColors,
  SyncState,
  AlignedContent,
} from './types'

// ── Path utilities ──
export {
  parsePath,
  formatPath,
  encodeSegment,
  decodeSegment,
  resolvePathToBlock,
  getAncestorBlockIds,
} from './utils/path'
export type { DiffPath } from './utils/path'

// ── Event system ──
export { TypedEventEmitter } from './utils/events'

// ── State management ──
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
} from './state/diff-state'

export type { DiffEditorState } from './state/diff-state'

// ── Extensions ──
export * from './extensions'

// ── Sync utilities ──
export {
  generateAlignedContentFromDiff,
  generateUnifiedContentFromDiff,
  tokensToStringBatch,
  SPACER_LINE,
} from './sync/visual-alignment'

export type { AlignmentResult, UnifiedResult, UnifiedContentOptions } from './sync/visual-alignment'

export { setupFoldSync } from './sync/fold-sync'
export { setupHeightSync } from './sync/height-sync'
export type { HeightSyncHandle } from './sync/height-sync'

// ── Themes ──
export {
  diffTheme,
  diffThemeLight,
  diffThemeDark,
  DiffThemeManager,
  lightColors,
  darkColors,
} from './themes'

// ── Navigation ──
export { createNavigationAPI } from './navigation/navigation-api'

// ── Diff builder ──
export { buildDiffBlock } from './diff-builder'
export { DiffBlockData, DiffLineData, Token } from './diff-builder/common'
export type { TokenTag, TokenType, LineDiff } from './diff-builder/common'
export { valueTokens } from './diff-builder/builder'
export type { FormatStrategy, FormatContext } from './diff-builder/builder'

// ── Fold utilities ──
export { foldAllInView, unfoldAllInView } from './coordinator'

// ── Fold placeholder ──
export { prepareFoldPlaceholder, createFoldPlaceholder } from './extensions/fold-placeholder'
export type { FoldPlaceholderData } from './extensions/fold-placeholder'

// ── Worker manager ──
export { DiffWorkerManager } from './worker/worker-manager'
