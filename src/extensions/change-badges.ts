/**
 * Change Badges Extension
 *
 * Displays inline badges showing change counts for API structure elements.
 * Badges appear next to keys/properties that have nested changes.
 */

import {
  Extension,
  StateField,
  StateEffect,
  RangeSet,
  RangeSetBuilder,
} from '@codemirror/state'
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import type { DiffType } from 'api-smart-diff'
import type { DiffBlockData } from '../diff-builder/common'
import type { DiffData, LineMapping } from '../types'
import type { BlockTreeIndex } from '../utils/block-index'

/** Badge data for a specific line */
export interface BadgeData {
  lineNumber: number
  position: number
  breaking: number
  nonBreaking: number
  annotation: number
  unclassified: number
  total: number
  blockId: string
}

/** Effect to set badge data */
export const setBadgeDataEffect = StateEffect.define<BadgeData[]>()

/** State field for badge data */
export const badgeDataField = StateField.define<BadgeData[]>({
  create() {
    return []
  },
  update(badges, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setBadgeDataEffect)) {
        return effect.value
      }
    }
    // Map positions through document changes
    if (tr.docChanged && badges.length > 0) {
      return badges.map(badge => ({
        ...badge,
        position: tr.changes.mapPos(badge.position),
      }))
    }
    return badges
  },
})

/** Widget for displaying change badges */
class ChangeBadgeWidget extends WidgetType {
  constructor(
    readonly breaking: number,
    readonly nonBreaking: number,
    readonly annotation: number,
    readonly unclassified: number,
    readonly blockId: string
  ) {
    super()
  }

  get total(): number {
    return this.breaking + this.nonBreaking + this.annotation + this.unclassified
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span')
    container.className = 'cm-change-badges'
    container.dataset.blockId = this.blockId

    // Breaking changes badge
    if (this.breaking > 0) {
      const badge = this.createBadge('breaking', this.breaking, 'Breaking changes')
      container.appendChild(badge)
    }

    // Non-breaking changes badge
    if (this.nonBreaking > 0) {
      const badge = this.createBadge('non-breaking', this.nonBreaking, 'Non-breaking changes')
      container.appendChild(badge)
    }

    // Annotation changes badge
    if (this.annotation > 0) {
      const badge = this.createBadge('annotation', this.annotation, 'Annotation changes')
      container.appendChild(badge)
    }

    // Unclassified changes badge
    if (this.unclassified > 0) {
      const badge = this.createBadge('unclassified', this.unclassified, 'Unclassified changes')
      container.appendChild(badge)
    }

    return container
  }

  private createBadge(type: string, count: number, title: string): HTMLElement {
    const badge = document.createElement('span')
    badge.className = `cm-change-badge cm-change-badge-${type}`
    badge.textContent = String(count)
    badge.title = `${count} ${title.toLowerCase()}`
    return badge
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof ChangeBadgeWidget &&
      other.breaking === this.breaking &&
      other.nonBreaking === this.nonBreaking &&
      other.annotation === this.annotation &&
      other.unclassified === this.unclassified &&
      other.blockId === this.blockId
    )
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** Build decorations from badge data */
function buildBadgeDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const badges = view.state.field(badgeDataField, false) || []
  const doc = view.state.doc

  // Sort badges by position
  const sortedBadges = [...badges].sort((a, b) => a.position - b.position)

  for (const badge of sortedBadges) {
    if (badge.total > 0 && badge.position >= 0 && badge.position <= doc.length) {
      const widget = new ChangeBadgeWidget(
        badge.breaking,
        badge.nonBreaking,
        badge.annotation,
        badge.unclassified,
        badge.blockId
      )

      const decoration = Decoration.widget({
        widget,
        side: 1, // After the position
      })

      builder.add(badge.position, badge.position, decoration)
    }
  }

  return builder.finish()
}

/** View plugin for change badges */
const changeBadgesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildBadgeDecorations(view)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.transactions.some(tr =>
          tr.effects.some(e => e.is(setBadgeDataEffect))
        )
      ) {
        this.decorations = buildBadgeDecorations(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
)

/** Count changes in a block and its children */
function countBlockChanges(block: DiffBlockData): {
  breaking: number
  nonBreaking: number
  annotation: number
  unclassified: number
} {
  let breaking = 0
  let nonBreaking = 0
  let annotation = 0
  let unclassified = 0

  // Count this block's change
  if (block.diff) {
    switch (block.diff.type) {
      case 'breaking':
        breaking++
        break
      case 'non-breaking':
        nonBreaking++
        break
      case 'annotation':
        annotation++
        break
      case 'unclassified':
        unclassified++
        break
    }
  }

  // Count children's changes
  for (const child of block.children) {
    const childCounts = countBlockChanges(child)
    breaking += childCounts.breaking
    nonBreaking += childCounts.nonBreaking
    annotation += childCounts.annotation
    unclassified += childCounts.unclassified
  }

  return { breaking, nonBreaking, annotation, unclassified }
}

/**
 * Build badge data from diff data and line mappings.
 *
 * When a treeIndex and blockLineRanges are provided, uses the pre-computed
 * index for O(C) where C = number of containers. Otherwise falls back to
 * recursively walking the block tree.
 */
export function buildBadgeData(
  doc: { line: (n: number) => { from: number; to: number }; readonly lines: number },
  diffData: DiffData,
  lineMap: LineMapping[],
  side: 'before' | 'after' | 'unified',
  treeIndex?: BlockTreeIndex,
  blockLineRanges?: Map<string, { start: number; end: number }>
): BadgeData[] {
  // Index-driven fast path
  if (treeIndex && blockLineRanges) {
    const badges: BadgeData[] = []

    for (const containerId of treeIndex.containerIds) {
      const entry = treeIndex.byId.get(containerId)
      if (!entry) continue

      const { counts } = entry
      const total = counts.breaking + counts.nonBreaking + counts.annotation + counts.unclassified
      if (total <= 0) continue

      const lineRange = blockLineRanges.get(containerId)
      if (!lineRange) continue

      const lineNum = lineRange.start
      if (lineNum < 1 || lineNum > doc.lines) continue

      try {
        const line = doc.line(lineNum)
        badges.push({
          lineNumber: lineNum,
          position: line.to,
          breaking: counts.breaking,
          nonBreaking: counts.nonBreaking,
          annotation: counts.annotation,
          unclassified: counts.unclassified,
          total,
          blockId: containerId,
        })
      } catch {
        // Line doesn't exist
      }
    }

    return badges
  }

  // Tree-walk fallback
  const badges: BadgeData[] = []
  const processedBlocks = new Set<string>()

  // Build a map of block IDs to their first line
  const blockFirstLines = new Map<string, number>()
  for (let i = 0; i < lineMap.length; i++) {
    const mapping = lineMap[i]
    if (mapping.blockId && !blockFirstLines.has(mapping.blockId)) {
      blockFirstLines.set(mapping.blockId, i + 1)
    }
  }

  const processBlocks = (blocks: DiffBlockData[]) => {
    for (const block of blocks) {
      if (block.children.length > 0 && block.id && !processedBlocks.has(block.id)) {
        processedBlocks.add(block.id)

        const counts = countBlockChanges(block)
        const total = counts.breaking + counts.nonBreaking + counts.annotation + counts.unclassified

        if (total > 0) {
          const lineNum = blockFirstLines.get(block.id)
          if (lineNum && lineNum <= doc.lines) {
            try {
              const line = doc.line(lineNum)
              badges.push({
                lineNumber: lineNum,
                position: line.to,
                breaking: counts.breaking,
                nonBreaking: counts.nonBreaking,
                annotation: counts.annotation,
                unclassified: counts.unclassified,
                total,
                blockId: block.id,
              })
            } catch {
              // Line doesn't exist in document
            }
          }
        }
      }

      processBlocks(block.children)
    }
  }

  processBlocks(diffData.blocks)

  return badges
}

/** Theme for change badges */
export const changeBadgesTheme = EditorView.baseTheme({
  '.cm-change-badges': {
    display: 'inline-flex',
    gap: '2px',
    marginLeft: '8px',
    verticalAlign: 'middle',
  },
  '.cm-change-badge': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '600',
    lineHeight: '1',
    cursor: 'default',
  },
  '.cm-change-badge-breaking': {
    backgroundColor: 'var(--diff-badge-breaking-bg, #ffebe9)',
    color: 'var(--diff-badge-breaking-color, #cf222e)',
    border: '1px solid var(--diff-badge-breaking-border, #ff8182)',
  },
  '.cm-change-badge-non-breaking': {
    backgroundColor: 'var(--diff-badge-non-breaking-bg, #dafbe1)',
    color: 'var(--diff-badge-non-breaking-color, #1a7f37)',
    border: '1px solid var(--diff-badge-non-breaking-border, #4ac26b)',
  },
  '.cm-change-badge-annotation': {
    backgroundColor: 'var(--diff-badge-annotation-bg, #ddf4ff)',
    color: 'var(--diff-badge-annotation-color, #0969da)',
    border: '1px solid var(--diff-badge-annotation-border, #54aeff)',
  },
  '.cm-change-badge-unclassified': {
    backgroundColor: 'var(--diff-badge-unclassified-bg, #eaeef2)',
    color: 'var(--diff-badge-unclassified-color, #57606a)',
    border: '1px solid var(--diff-badge-unclassified-border, #afb8c1)',
  },
  // Dark mode
  '&dark .cm-change-badge-breaking': {
    backgroundColor: 'var(--diff-badge-breaking-bg, #490202)',
    color: 'var(--diff-badge-breaking-color, #ff7b72)',
    borderColor: 'var(--diff-badge-breaking-border, #f85149)',
  },
  '&dark .cm-change-badge-non-breaking': {
    backgroundColor: 'var(--diff-badge-non-breaking-bg, #04260f)',
    color: 'var(--diff-badge-non-breaking-color, #3fb950)',
    borderColor: 'var(--diff-badge-non-breaking-border, #238636)',
  },
  '&dark .cm-change-badge-annotation': {
    backgroundColor: 'var(--diff-badge-annotation-bg, #0c2d6b)',
    color: 'var(--diff-badge-annotation-color, #58a6ff)',
    borderColor: 'var(--diff-badge-annotation-border, #1f6feb)',
  },
  '&dark .cm-change-badge-unclassified': {
    backgroundColor: 'var(--diff-badge-unclassified-bg, #21262d)',
    color: 'var(--diff-badge-unclassified-color, #8b949e)',
    borderColor: 'var(--diff-badge-unclassified-border, #30363d)',
  },
})

/** Create the change badges extension */
export function changeBadges(): Extension {
  return [
    badgeDataField,
    changeBadgesPlugin,
    changeBadgesTheme,
  ]
}

export { ChangeBadgeWidget }
