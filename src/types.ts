import type { EditorView } from '@codemirror/view'
import type { DiffType, ActionType, DiffMeta } from 'api-smart-diff'
import type { DiffBlockData } from './diff-builder/common'
import type { DiffPath } from './utils/path'

/** JSON primitive types */
export type JsonPrimitive = string | number | boolean | null

/** JSON array */
export type JsonArray = JsonValue[]

/** JSON object */
export type JsonObject = { [key: string]: JsonValue }

/** Any valid JSON value (plus Date for YAML/API spec compatibility) */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject | Date

/** Merged document object with $diff metadata from api-smart-diff */
export type MergedObject = {
  [key: string]: JsonValue | MergedObject | MergedArray
} & { $diff?: Record<string, DiffMeta> }

/** Merged document array from api-smart-diff */
export type MergedArray = Array<JsonValue | MergedObject | MergedArray>

/** Top-level merged document from api-smart-diff */
export type MergedDocument = MergedObject | MergedArray

/** Line mapping between before and after documents */
export interface LineMapping {
  beforeLine: number | null
  afterLine: number | null
  type: 'unchanged' | 'modified' | 'added' | 'removed'
  blockId?: string
  /** Diff type from api-smart-diff (breaking, non-breaking, annotation, unclassified) */
  diffType?: DiffType
  /** True if this line is the root of a logical change (not a child of a changed parent) */
  isChangeRoot?: boolean
  /** Links paired remove+add lines that originated from the same modified line */
  pairId?: string
}

/** Block mapping for API structure elements */
export interface BlockMapping {
  id: string
  beforeRange: { from: number; to: number } | null
  afterRange: { from: number; to: number } | null
  children: BlockMapping[]
}

/** Diff data computed by api-smart-diff */
export interface DiffData {
  blocks: DiffBlockData[]
  lineMap: LineMapping[]
  blockMap: BlockMapping[]
}

/** Configuration options for the diff extension */
export interface DiffConfig {
  side: 'before' | 'after' | 'unified'
  format: 'json' | 'yaml'
  showClassification: boolean
  showMinimap: boolean
  enableFolding: boolean
  enableSearch: boolean
  filters: DiffType[]
  hideUnchanged: boolean
  pairedEditor?: EditorView
  syncFolds: boolean
  syncSelection: boolean
  onBlockSelect?: (blockId: string) => void
}

/** Default configuration values */
export const defaultDiffConfig: DiffConfig = {
  side: 'after',
  format: 'yaml',
  showClassification: true,
  showMinimap: false,
  enableFolding: true,
  enableSearch: true,
  filters: [],
  hideUnchanged: false,
  syncFolds: true,
  syncSelection: true,
}

/** Navigation options for scrolling to paths */
export interface NavigationOptions {
  /** Scroll behavior. Default: 'smooth' */
  behavior?: 'smooth' | 'instant'
  /** Vertical alignment of the target. Default: 'center' */
  align?: 'start' | 'center' | 'end'
  /** Highlight the target path. Default: true */
  highlight?: boolean
}

/** Summary of changes in the diff */
export interface ChangeSummary {
  total: number
  breaking: number
  nonBreaking: number
  annotation: number
  unclassified: number
  byPath: Map<string, { type: DiffType; count: number }[]>
}

/** Options for findPaths search */
export interface FindPathsOptions {
  /** Case-sensitive search. Default: false */
  caseSensitive?: boolean
  /** Search in keys only, values only, or both. Default: 'both' */
  searchIn?: 'keys' | 'values' | 'both'
  /** Maximum number of results. Default: unlimited */
  limit?: number
}

/** Search result from findPaths */
export interface PathSearchResult {
  /** Full path to the match (string form) */
  path: string
  /** The matched text fragment */
  matchedText: string
  /** Whether the match was in a key or value */
  matchLocation: 'key' | 'value'
  /** Diff classification if this path has a direct change */
  diffType?: DiffType
}

/** Descriptor for a child key in tree inspection */
export interface ChildKeyInfo {
  /** The key name (decoded — literal, not encoded) */
  key: string
  /** Full path to this child (string form, encoded) */
  path: string
  /** Whether this key has direct changes (own $diff metadata) */
  hasDirectChange: boolean
  /** Diff type of the direct change, if any */
  diffType?: DiffType
  /** Action type of the direct change, if any */
  action?: ActionType
  /** Whether this key has nested children (is an object/array) */
  hasChildren: boolean
  /**
   * Aggregate change counts in this subtree, by classification type.
   * Index mapping: [breaking, non-breaking, annotation, unclassified]
   */
  changeCounts: [number, number, number, number]
}

/** Navigation API for programmatic control (path-based) */
export interface NavigationAPI {
  /**
   * Move to the next change matching the given classification types.
   * Wraps around at the end. Returns the path of the change, or null if no match.
   * When types are omitted, matches any change type.
   */
  goToNextChange(...types: DiffType[]): string | null

  /**
   * Move to the previous change. Same behavior as goToNextChange but
   * in reverse document order.
   */
  goToPrevChange(...types: DiffType[]): string | null

  /**
   * Navigate to a specific path in the document.
   * Expands any collapsed ancestors so the path is visible.
   */
  goToPath(path: DiffPath, options?: NavigationOptions): void

  /**
   * Find paths whose key or value contains the search text.
   * Returns matching paths sorted by document order.
   */
  findPaths(text: string, options?: FindPathsOptions): PathSearchResult[]

  /**
   * Get the immediate child keys of a path.
   * If path is omitted or empty, returns root-level keys.
   */
  getChildKeys(path?: DiffPath): ChildKeyInfo[]

  /** Get aggregate change counters for the entire document */
  getChangeSummary(): ChangeSummary

  /** Get the path of the currently selected/highlighted change */
  getCurrentPath(): string | null

  /**
   * Subscribe to navigation changes. Fires when the current path changes.
   * @returns Unsubscribe function
   */
  onNavigate(callback: (path: string | null) => void): () => void
}

/** Diff decoration for visual highlighting */
export interface DiffDecoration {
  from: number
  to: number
  type: DiffType
  action: ActionType
  side: 'before' | 'after'
}

/** Word-level diff result */
export interface WordDiff {
  from: number
  to: number
  type: 'added' | 'removed'
}

/** CSS variables for diff colors */
export interface DiffThemeColors {
  addedBg?: string
  removedBg?: string
  modifiedBg?: string
  breakingColor?: string
  nonBreakingColor?: string
  annotationColor?: string
  unclassifiedColor?: string
  addedTextBg?: string
  removedTextBg?: string
  spacerBg?: string
  spacerStripe?: string
  correspondingHighlight?: string
}

/** Synchronization state shared between editors */
export interface SyncState {
  lineMap: LineMapping[]
  blockMap: BlockMapping[]
  foldedBlocks: Set<string>
  selectedBlock: string | null
  highlightedRange: { side: 'before' | 'after'; from: number; to: number } | null
}

/** Result of aligned content generation */
export interface AlignedContent {
  before: string
  after: string
  lineMap: LineMapping[]
}
