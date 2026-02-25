import { describe, it, expect } from 'vitest'
import {
  generateAlignedContentFromDiff,
  generateUnifiedContentFromDiff,
  SPACER_LINE,
} from '../../src/sync/visual-alignment'
import { DiffBlockData } from '../../src/diff-builder/common'
import { Token } from '../../src/diff-builder/common'

/**
 * Helper to create a simple DiffBlockData with tokens.
 */
function makeLine(
  index: number,
  indent: number,
  tokens: Token[],
  diff?: { action: string; type: string },
  id = ''
): DiffBlockData {
  const block = new DiffBlockData(index, indent, tokens, diff as any, id)
  return block
}

function makeToken(value: string, tags?: string[]): Token {
  return new Token('value', value, tags as any)
}

/**
 * Create a minimal diff block tree with unchanged, added, removed, and replaced lines.
 */
function createTestBlocks(): DiffBlockData[] {
  const root = new DiffBlockData(1, -2, [])

  // Unchanged line
  root.addBlock(
    makeLine(1, 0, [makeToken('key: value')])
  )
  // Added line
  root.addBlock(
    makeLine(2, 0, [makeToken('newKey: newValue')], { action: 'add', type: 'non-breaking' }, 'add1')
  )
  // Removed line
  root.addBlock(
    makeLine(3, 0, [makeToken('oldKey: oldValue')], { action: 'remove', type: 'breaking' }, 'rm1')
  )
  // Modified/replaced line
  root.addBlock(
    makeLine(4, 0, [
      makeToken('key: ', []),
      makeToken('before', ['before']),
      makeToken('after', ['after']),
    ], { action: 'replace', type: 'non-breaking' }, 'rep1')
  )

  return [root]
}

function createBlockWithAction(action: string): DiffBlockData[] {
  const root = new DiffBlockData(1, -2, [])
  const diff = { action, type: 'non-breaking' }

  root.addBlock(
    makeLine(1, 0, [
      makeToken('key: ', []),
      makeToken('old', ['before']),
      makeToken('new', ['after']),
    ], diff as any, `${action}1`)
  )

  return [root]
}

describe('generateAlignedContentFromDiff', () => {
  it('returns arrays of equal length for before and after', () => {
    const blocks = createTestBlocks()
    const result = generateAlignedContentFromDiff(blocks, 'yaml')
    expect(result.beforeLines.length).toBe(result.afterLines.length)
    expect(result.lineMap.length).toBe(result.beforeLines.length)
  })

  it('inserts spacers for added lines on the before side', () => {
    const blocks = createBlockWithAction('add')
    const result = generateAlignedContentFromDiff(blocks, 'yaml')
    expect(result.beforeSpacers.size).toBeGreaterThan(0)
  })

  it('inserts spacers for removed lines on the after side', () => {
    const blocks = createBlockWithAction('remove')
    const result = generateAlignedContentFromDiff(blocks, 'yaml')
    expect(result.afterSpacers.size).toBeGreaterThan(0)
  })

  it('wraps JSON content in braces', () => {
    const blocks = createTestBlocks()
    const result = generateAlignedContentFromDiff(blocks, 'json')
    expect(result.beforeLines[0]).toBe('{')
    expect(result.beforeLines[result.beforeLines.length - 1]).toBe('}')
    expect(result.afterLines[0]).toBe('{')
    expect(result.afterLines[result.afterLines.length - 1]).toBe('}')
  })

  it('does not wrap YAML content in braces', () => {
    const blocks = createTestBlocks()
    const result = generateAlignedContentFromDiff(blocks, 'yaml')
    expect(result.beforeLines[0]).not.toBe('{')
  })

  it('splits replace into remove+add when wordDiffMode is none', () => {
    const blocks = createBlockWithAction('replace')
    const result = generateAlignedContentFromDiff(blocks, 'yaml', {
      wordDiffMode: 'none',
    })
    const hasRemoved = result.lineMap.some(m => m.type === 'removed')
    const hasAdded = result.lineMap.some(m => m.type === 'added')
    expect(hasRemoved).toBe(true)
    expect(hasAdded).toBe(true)
  })

  it('keeps replace as modified when wordDiffMode is word', () => {
    const blocks = createBlockWithAction('replace')
    const result = generateAlignedContentFromDiff(blocks, 'yaml', {
      wordDiffMode: 'word',
    })
    const hasModified = result.lineMap.some(m => m.type === 'modified')
    expect(hasModified).toBe(true)
  })

  it('produces no embedded newlines in any line', () => {
    const blocks = createTestBlocks()
    const result = generateAlignedContentFromDiff(blocks, 'yaml')
    for (const line of result.beforeLines) {
      expect(line).not.toContain('\n')
    }
    for (const line of result.afterLines) {
      expect(line).not.toContain('\n')
    }
  })

  it('produces at least one line for non-empty blocks', () => {
    const blocks = createTestBlocks()
    const result = generateAlignedContentFromDiff(blocks, 'yaml')
    expect(result.beforeLines.length).toBeGreaterThan(0)
  })

  it('handles empty blocks array', () => {
    const result = generateAlignedContentFromDiff([], 'yaml')
    expect(result.beforeLines.length).toBe(0)
    expect(result.afterLines.length).toBe(0)
    expect(result.lineMap.length).toBe(0)
  })

  it('marks correct line types in lineMap', () => {
    const blocks = createTestBlocks()
    const result = generateAlignedContentFromDiff(blocks, 'yaml')

    const types = result.lineMap.map(m => m.type)
    expect(types).toContain('unchanged')
    expect(types).toContain('added')
    expect(types).toContain('removed')
    expect(types).toContain('modified')
  })
})

describe('generateUnifiedContentFromDiff', () => {
  it('returns lines and lineMap of equal length', () => {
    const blocks = createTestBlocks()
    const result = generateUnifiedContentFromDiff(blocks, 'yaml')
    expect(result.lines.length).toBe(result.lineMap.length)
  })

  it('shows modified as single line with beforeContentMap when inlineWordDiff true', () => {
    const blocks = createBlockWithAction('replace')
    const result = generateUnifiedContentFromDiff(blocks, 'yaml', { inlineWordDiff: true })
    const modified = result.lineMap.filter(m => m.type === 'modified')
    expect(modified.length).toBeGreaterThan(0)
    expect(result.beforeContentMap).toBeDefined()
    expect(result.beforeContentMap!.size).toBeGreaterThan(0)
  })

  it('shows modified as remove+add when inlineWordDiff false', () => {
    const blocks = createBlockWithAction('replace')
    const result = generateUnifiedContentFromDiff(blocks, 'yaml', { inlineWordDiff: false })
    const modified = result.lineMap.filter(m => m.type === 'modified')
    expect(modified.length).toBe(0) // Split into removed + added
    const removed = result.lineMap.filter(m => m.type === 'removed')
    const added = result.lineMap.filter(m => m.type === 'added')
    expect(removed.length).toBeGreaterThan(0)
    expect(added.length).toBeGreaterThan(0)
  })

  it('wraps JSON in braces', () => {
    const blocks = createTestBlocks()
    const result = generateUnifiedContentFromDiff(blocks, 'json')
    expect(result.lines[0]).toBe('{')
    expect(result.lines[result.lines.length - 1]).toBe('}')
  })

  it('handles empty blocks', () => {
    const result = generateUnifiedContentFromDiff([], 'yaml')
    expect(result.lines.length).toBe(0)
    expect(result.lineMap.length).toBe(0)
  })

  it('includes removed lines for remove action', () => {
    const blocks = createBlockWithAction('remove')
    const result = generateUnifiedContentFromDiff(blocks, 'yaml')
    const removed = result.lineMap.filter(m => m.type === 'removed')
    expect(removed.length).toBeGreaterThan(0)
  })

  it('includes added lines for add action', () => {
    const blocks = createBlockWithAction('add')
    const result = generateUnifiedContentFromDiff(blocks, 'yaml')
    const added = result.lineMap.filter(m => m.type === 'added')
    expect(added.length).toBeGreaterThan(0)
  })
})

describe('SPACER_LINE', () => {
  it('is a non-empty string of non-breaking spaces', () => {
    expect(SPACER_LINE.length).toBeGreaterThan(0)
    expect(SPACER_LINE.trim().length).toBe(0) // only whitespace-like chars
  })
})
