import { describe, it, expect } from 'vitest'
import { buildDiffBlock } from '../../src/diff-builder/index'
import { buildDiff, valueTokens } from '../../src/diff-builder/builder'
import { jsonStrategy } from '../../src/diff-builder/json-strategy'
import { yamlStrategy } from '../../src/diff-builder/yaml-strategy'
import { apiMerge } from 'api-smart-diff'
import { DiffBlockData, Token, metaKey } from '../../src/diff-builder/common'

// ─── valueTokens ───────────────────────────────────────────────────────

describe('valueTokens', () => {
  const stringify = JSON.stringify
  const tokenCtor = Token.Value

  it('returns a single token for a simple value with no diff', () => {
    const tokens = valueTokens(stringify, tokenCtor, 'hello')
    expect(tokens.length).toBe(1)
    expect(tokens[0].value).toBe('"hello"')
    expect(tokens[0].tags).toEqual([])
  })

  it('returns before/after tokens for a non-string replaced value', () => {
    const diff = { action: 'replace' as const, type: 'breaking' as const, replaced: 100 }
    const tokens = valueTokens(stringify, tokenCtor, 42, diff)

    // Should have before (old) and after (new) tokens
    const beforeTokens = tokens.filter(t => t.tags.includes('before'))
    const afterTokens = tokens.filter(t => t.tags.includes('after'))
    expect(beforeTokens.length).toBeGreaterThan(0)
    expect(afterTokens.length).toBeGreaterThan(0)
  })

  it('uses word-level diff for replaced string values', () => {
    const diff = { action: 'replace' as const, type: 'breaking' as const, replaced: '"Old Title"' }
    const tokens = valueTokens(stringify, tokenCtor, 'New Title', diff)
    // diffWords should produce multiple change segments
    expect(tokens.length).toBeGreaterThan(1)
  })

  it('returns a token with "after" tag when replaced is present and value is not string', () => {
    const diff = { action: 'replace' as const, type: 'breaking' as const, replaced: false }
    const tokens = valueTokens(stringify, tokenCtor, true, diff)

    const afterToken = tokens.find(t => t.tags.includes('after'))
    expect(afterToken).toBeDefined()
    expect(afterToken!.value).toBe('true')
  })

  it('returns a token with "before" tag for the old replaced value', () => {
    const diff = { action: 'replace' as const, type: 'breaking' as const, replaced: false }
    const tokens = valueTokens(stringify, tokenCtor, true, diff)

    const beforeToken = tokens.find(t => t.tags.includes('before'))
    expect(beforeToken).toBeDefined()
    expect(beforeToken!.value).toBe('false')
  })

  it('handles null value', () => {
    const tokens = valueTokens(stringify, tokenCtor, null)
    expect(tokens.length).toBe(1)
    expect(tokens[0].value).toBe('null')
  })

  it('handles number value', () => {
    const tokens = valueTokens(stringify, tokenCtor, 3.14)
    expect(tokens[0].value).toBe('3.14')
  })
})

// ─── buildDiff ─────────────────────────────────────────────────────────

describe('buildDiff', () => {
  it('creates children for each property in an object', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ a: 1, b: 2, c: 3 }, parent, jsonStrategy)
    expect(parent.children.length).toBe(3)
  })

  it('creates children for each element in an array', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff(['x', 'y', 'z'], parent, jsonStrategy)
    expect(parent.children.length).toBe(3)
  })

  it('skips the $diff metaKey in object keys', () => {
    const parent = new DiffBlockData(1, -2, [])
    const input = { a: 1, [metaKey]: { a: { action: 'replace', type: 'breaking' } }, b: 2 }
    buildDiff(input, parent, jsonStrategy)
    // Should only have 'a' and 'b', not '$diff'
    expect(parent.children.length).toBe(2)
  })

  it('picks up diff metadata from the $diff key', () => {
    const parent = new DiffBlockData(1, -2, [])
    const input = {
      title: 'Hello',
      [metaKey]: { title: { action: 'replace', type: 'breaking', replaced: 'Old' } },
    }
    buildDiff(input, parent, yamlStrategy)

    const titleChild = parent.children[0]
    expect(titleChild.diff).toBeDefined()
    expect(titleChild.diff!.action).toBe('replace')
  })

  it('accumulates diffs on parent from children', () => {
    const parent = new DiffBlockData(1, -2, [])
    const input = {
      a: 'new',
      [metaKey]: { a: { action: 'add', type: 'non-breaking' } },
    }
    buildDiff(input, parent, yamlStrategy)
    expect(parent.diffs[1]).toBe(1) // non-breaking index
  })

  it('creates nested blocks for object values', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ info: { title: 'A' } }, parent, jsonStrategy)

    expect(parent.children.length).toBe(1)
    const infoBlock = parent.children[0]
    expect(infoBlock.children.length).toBeGreaterThan(0)
  })

  it('assigns id to container blocks', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ info: { title: 'A' } }, parent, jsonStrategy)

    const infoBlock = parent.children[0]
    expect(infoBlock.id).toBe('info')
    const titleBlock = infoBlock.children.find(c => c.id === 'info/title')
    // All blocks (including leaves) get path-based ids
    expect(titleBlock).toBeDefined()
    expect(infoBlock.children.length).toBeGreaterThan(0)
  })

  it('encodes slashes in block ids', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ 'a/b': { c: 1 } }, parent, jsonStrategy)

    const block = parent.children[0]
    expect(block.id).toBe('a~1b')
  })

  it('tracks line counts correctly', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ a: 1, b: 2 }, parent, yamlStrategy)

    // Each leaf property is 1 line in YAML
    expect(parent.lines).toBe(2)
  })

  it('tracks line counts for nested objects in JSON', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ info: { title: 'A' } }, parent, jsonStrategy)

    // JSON: "info": {  (1 line) + "title": "A" (1 line) + } (1 line) = 3 lines
    expect(parent.lines).toBe(3)
  })

  it('creates end block tokens for JSON containers', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ info: { title: 'A' } }, parent, jsonStrategy)

    const infoBlock = parent.children[0]
    // Last child should be the closing brace
    const lastChild = infoBlock.children[infoBlock.children.length - 1]
    const hasClosingBrace = lastChild.tokens.some(t => t.value.includes('}'))
    expect(hasClosingBrace).toBe(true)
  })

  it('does not create end block tokens for YAML containers', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ info: { title: 'A' } }, parent, yamlStrategy)

    const infoBlock = parent.children[0]
    // YAML has no closing braces
    for (const child of infoBlock.children) {
      const hasClosingBrace = child.tokens.some(t => t.value.includes('}'))
      expect(hasClosingBrace).toBe(false)
    }
  })

  it('handles empty object value as leaf', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ empty: {} }, parent, yamlStrategy)

    // {} is considered isEmpty=true so it's a leaf
    expect(parent.children.length).toBe(1)
    const child = parent.children[0]
    expect(child.children.length).toBe(0) // leaf, no children
  })

  it('handles empty array value as leaf', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ empty: [] }, parent, yamlStrategy)

    expect(parent.children.length).toBe(1)
    const child = parent.children[0]
    expect(child.children.length).toBe(0) // leaf, no children
  })

  it('handles Date values as leaf', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ date: new Date('2024-01-01') }, parent, yamlStrategy)

    expect(parent.children.length).toBe(1)
    expect(parent.children[0].children.length).toBe(0)
  })

  it('handles nested arrays', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ items: ['a', 'b'] }, parent, yamlStrategy)

    const itemsBlock = parent.children[0]
    expect(itemsBlock.children.length).toBe(2)
  })

  it('calls addBlockTokens at the end', () => {
    const parent = new DiffBlockData(1, -2, [])
    const input = {
      a: 'x',
      [metaKey]: { a: { action: 'add', type: 'breaking' } },
    }

    // JSON strategy's addBlockTokens appends Change tokens
    buildDiff(input, parent, jsonStrategy)

    // The parent has no tokens (it's a container root), so addBlockTokens won't add
    // But the child block should have been processed
    expect(parent.children.length).toBe(1)
  })

  it('sets ctx.last correctly for the final property', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ first: 1, second: 2 }, parent, jsonStrategy)

    // In JSON, the last property should not have a trailing comma
    const lastChild = parent.children[parent.children.length - 1]
    const lastTokenValue = lastChild.tokens[lastChild.tokens.length - 1].value
    expect(lastTokenValue).not.toBe(',')
  })

  it('sets ctx.last correctly for non-final properties', () => {
    const parent = new DiffBlockData(1, -2, [])
    buildDiff({ first: 1, second: 2 }, parent, jsonStrategy)

    // In JSON, the first property should have a trailing comma
    const firstChild = parent.children[0]
    const lastTokenValue = firstChild.tokens[firstChild.tokens.length - 1].value
    expect(lastTokenValue).toBe(',')
  })
})

// ─── buildDiffBlock (integration via apiMerge) ─────────────────────────

describe('buildDiffBlock', () => {
  it('returns a DiffBlockData instance', () => {
    const before = { openapi: '3.0.0', info: { title: 'A', version: '1.0' } }
    const after = { openapi: '3.0.0', info: { title: 'B', version: '1.0' } }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    expect(root).toBeInstanceOf(DiffBlockData)
  })

  it('returns a root block with children for a non-trivial spec', () => {
    const before = { openapi: '3.0.0', info: { title: 'A', version: '1.0' } }
    const after = { openapi: '3.0.0', info: { title: 'B', version: '1.0' } }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    expect(root.children.length).toBeGreaterThan(0)
  })

  it('marks changed properties with diff metadata', () => {
    const before = { title: 'Old' }
    const after = { title: 'New' }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')

    const findChanged = (block: DiffBlockData): boolean => {
      if (block.diff) return true
      return block.children.some(findChanged)
    }

    expect(findChanged(root)).toBe(true)
  })

  it('handles both json and yaml formats', () => {
    const before = { key: 'value' }
    const after = { key: 'changed' }
    const merged = apiMerge(before, after)

    const yamlRoot = buildDiffBlock(merged, 'yaml')
    const jsonRoot = buildDiffBlock(merged, 'json')

    expect(yamlRoot).toBeDefined()
    expect(jsonRoot).toBeDefined()
    expect(yamlRoot.children.length).toBeGreaterThan(0)
    expect(jsonRoot.children.length).toBeGreaterThan(0)
  })

  it('defaults to yaml format', () => {
    const before = { key: 'value' }
    const after = { key: 'changed' }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged)
    expect(root).toBeDefined()
    expect(root.children.length).toBeGreaterThan(0)
  })

  it('produces diff counts for changed blocks', () => {
    const before = { openapi: '3.0.0', info: { title: 'Old', version: '1.0' } }
    const after = { openapi: '3.0.0', info: { title: 'New', version: '2.0' } }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    const totalDiffs = root.diffs.reduce((sum, n) => sum + n, 0)
    expect(totalDiffs).toBeGreaterThan(0)
  })

  it('handles identical specs (no changes)', () => {
    const spec = { openapi: '3.0.0', info: { title: 'Same', version: '1.0' } }
    const merged = apiMerge(spec, spec)

    const root = buildDiffBlock(merged, 'yaml')
    expect(root).toBeDefined()

    const findChanged = (block: DiffBlockData): boolean => {
      if (block.diff) return true
      return block.children.some(findChanged)
    }
    expect(findChanged(root)).toBe(false)
  })

  it('handles added properties', () => {
    const before = { key: 'value' }
    const after = { key: 'value', newKey: 'newValue' }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')

    const findAdded = (block: DiffBlockData): boolean => {
      if (block.diff?.action === 'add') return true
      return block.children.some(findAdded)
    }
    expect(findAdded(root)).toBe(true)
  })

  it('handles removed properties', () => {
    const before = { key: 'value', oldKey: 'oldValue' }
    const after = { key: 'value' }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')

    const findRemoved = (block: DiffBlockData): boolean => {
      if (block.diff?.action === 'remove') return true
      return block.children.some(findRemoved)
    }
    expect(findRemoved(root)).toBe(true)
  })

  it('handles nested objects', () => {
    const before = { info: { contact: { name: 'Old' } } }
    const after = { info: { contact: { name: 'New' } } }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    expect(root.children.length).toBeGreaterThan(0)

    const findDepth = (block: DiffBlockData, depth: number): number => {
      let maxDepth = depth
      for (const child of block.children) {
        maxDepth = Math.max(maxDepth, findDepth(child, depth + 1))
      }
      return maxDepth
    }
    expect(findDepth(root, 0)).toBeGreaterThanOrEqual(2)
  })

  it('handles arrays', () => {
    const before = { items: ['a', 'b'] }
    const after = { items: ['a', 'c'] }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    expect(root).toBeDefined()
    expect(root.children.length).toBeGreaterThan(0)
  })

  it('tracks line count correctly', () => {
    const before = { a: '1', b: '2', c: '3' }
    const after = { a: '1', b: 'changed', c: '3' }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    expect(root.lines).toBeGreaterThan(0)
  })

  it('JSON produces more lines than YAML for same content', () => {
    const before = { info: { title: 'A' } }
    const after = { info: { title: 'B' } }
    const merged = apiMerge(before, after)

    const yamlRoot = buildDiffBlock(merged, 'yaml')
    const jsonRoot = buildDiffBlock(merged, 'json')

    // JSON adds { and } lines for each container
    expect(jsonRoot.lines).toBeGreaterThan(yamlRoot.lines)
  })

  it('JSON container blocks have closing brace children', () => {
    const before = { info: { title: 'A' } }
    const after = { info: { title: 'B' } }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'json')
    const infoBlock = root.children[0]
    const lastChild = infoBlock.children[infoBlock.children.length - 1]

    expect(lastChild.tokens.some(t => t.value.includes('}'))).toBe(true)
  })

  it('YAML container blocks have no closing brace children', () => {
    const before = { info: { title: 'A' } }
    const after = { info: { title: 'B' } }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    const infoBlock = root.children[0]

    for (const child of infoBlock.children) {
      const hasBrace = child.tokens.some(t =>
        t.value.includes('}') || t.value.includes(']')
      )
      expect(hasBrace).toBe(false)
    }
  })

  it('produces tokens with before/after tags for replaced values', () => {
    const before = { title: 'Old' }
    const after = { title: 'New' }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')

    const collectTokens = (block: DiffBlockData): Token[] => {
      const tokens = [...block.tokens]
      for (const child of block.children) {
        tokens.push(...collectTokens(child))
      }
      return tokens
    }

    const allTokens = collectTokens(root)
    const hasBefore = allTokens.some(t => t.tags.includes('before'))
    const hasAfter = allTokens.some(t => t.tags.includes('after'))
    expect(hasBefore).toBe(true)
    expect(hasAfter).toBe(true)
  })

  it('handles deeply nested API spec', () => {
    const before = {
      openapi: '3.0.0',
      paths: {
        '/users': {
          get: {
            responses: {
              '200': { description: 'OK' },
            },
          },
        },
      },
    }
    const after = {
      openapi: '3.0.0',
      paths: {
        '/users': {
          get: {
            responses: {
              '200': { description: 'Success' },
            },
          },
        },
      },
    }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')
    expect(root.lines).toBeGreaterThan(5)

    const findChanged = (block: DiffBlockData): boolean => {
      if (block.diff) return true
      return block.children.some(findChanged)
    }
    expect(findChanged(root)).toBe(true)
  })

  it('handles array item additions', () => {
    const before = { tags: ['tag1'] }
    const after = { tags: ['tag1', 'tag2'] }
    const merged = apiMerge(before, after, { arrayMeta: true })

    const root = buildDiffBlock(merged, 'yaml')

    // apiMerge stores array diffs in a nested $diff.tags.array structure
    // The builder propagates the parent diff to array children,
    // so verify the tree is built correctly and has diff metadata
    const tagsBlock = root.children[0]
    expect(tagsBlock).toBeDefined()
    expect(tagsBlock.children.length).toBe(2) // both items present in merged
    // The block's diff should carry the array diff metadata
    expect(tagsBlock.diff).toBeDefined()
  })

  it('handles array item removals', () => {
    const before = { tags: ['tag1', 'tag2'] }
    const after = { tags: ['tag1'] }
    const merged = apiMerge(before, after, { arrayMeta: true })

    const root = buildDiffBlock(merged, 'yaml')

    const tagsBlock = root.children[0]
    expect(tagsBlock).toBeDefined()
    expect(tagsBlock.children.length).toBe(2) // both items present in merged
    expect(tagsBlock.diff).toBeDefined()
  })

  it('handles mixed changes (add + remove + replace)', () => {
    const before = { a: 'keep', b: 'old', c: 'remove_me' }
    const after = { a: 'keep', b: 'new', d: 'added' }
    const merged = apiMerge(before, after)

    const root = buildDiffBlock(merged, 'yaml')

    const collectActions = (block: DiffBlockData): Set<string> => {
      const actions = new Set<string>()
      if (block.diff?.action) actions.add(block.diff.action)
      for (const child of block.children) {
        for (const a of collectActions(child)) actions.add(a)
      }
      return actions
    }

    const actions = collectActions(root)
    expect(actions.has('add')).toBe(true)
    expect(actions.has('remove')).toBe(true)
    expect(actions.has('replace')).toBe(true)
  })
})
