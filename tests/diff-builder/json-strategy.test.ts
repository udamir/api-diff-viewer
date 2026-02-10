import { describe, it, expect } from 'vitest'
import { jsonStrategy } from '../../src/diff-builder/json-strategy'
import { DiffBlockData, Token } from '../../src/diff-builder/common'
import type { FormatContext } from '../../src/diff-builder/builder'

const ctx = (last = false, level = 0): FormatContext => ({ last, level })

describe('jsonStrategy', () => {
  describe('stringify', () => {
    it('is JSON.stringify', () => {
      expect(jsonStrategy.stringify('hello')).toBe('"hello"')
      expect(jsonStrategy.stringify(42)).toBe('42')
      expect(jsonStrategy.stringify(true)).toBe('true')
      expect(jsonStrategy.stringify(null)).toBe('null')
    })
  })

  describe('propLineTokens', () => {
    it('produces key: value tokens for a string property', () => {
      const tokens = jsonStrategy.propLineTokens('title', 'Hello', undefined, ctx())
      const text = tokens.map(t => t.value).join('')
      expect(text).toContain('"title"')
      expect(text).toContain(': ')
      expect(text).toContain('"Hello"')
    })

    it('adds trailing comma when not last', () => {
      const tokens = jsonStrategy.propLineTokens('key', 'val', undefined, ctx(false))
      const last = tokens[tokens.length - 1]
      expect(last.value).toBe(',')
    })

    it('omits trailing comma when last', () => {
      const tokens = jsonStrategy.propLineTokens('key', 'val', undefined, ctx(true))
      const values = tokens.map(t => t.value)
      expect(values[values.length - 1]).not.toBe(',')
    })

    it('produces before/after tokens for a replace diff', () => {
      const diff = { action: 'replace' as const, type: 'breaking' as const, replaced: 'Old' }
      const tokens = jsonStrategy.propLineTokens('key', 'New', diff, ctx())
      const hasBefore = tokens.some(t => t.tags.includes('before'))
      const hasAfter = tokens.some(t => t.tags.includes('after'))
      expect(hasBefore || hasAfter).toBe(true)
    })

    it('handles number value', () => {
      const tokens = jsonStrategy.propLineTokens('count', 42, undefined, ctx())
      const text = tokens.map(t => t.value).join('')
      expect(text).toContain('42')
    })

    it('handles boolean value', () => {
      const tokens = jsonStrategy.propLineTokens('flag', true, undefined, ctx())
      const text = tokens.map(t => t.value).join('')
      expect(text).toContain('true')
    })

    it('handles null value', () => {
      const tokens = jsonStrategy.propLineTokens('empty', null, undefined, ctx())
      const text = tokens.map(t => t.value).join('')
      expect(text).toContain('null')
    })

    it('handles rename diff by generating value tokens for key', () => {
      const diff = { action: 'rename' as const, type: 'breaking' as const, replaced: 'oldKey' }
      const tokens = jsonStrategy.propLineTokens('newKey', 'val', diff, ctx())
      // Key should have before/after tags for the rename
      const keyTokens = tokens.filter(t => t.type === 'key')
      expect(keyTokens.length).toBeGreaterThan(0)
    })
  })

  describe('arrLineTokens', () => {
    it('produces value tokens for array items', () => {
      const tokens = jsonStrategy.arrLineTokens('hello', undefined, ctx())
      const text = tokens.map(t => t.value).join('')
      expect(text).toContain('"hello"')
    })

    it('adds trailing comma when not last', () => {
      const tokens = jsonStrategy.arrLineTokens('item', undefined, ctx(false))
      const last = tokens[tokens.length - 1]
      expect(last.value).toBe(',')
    })

    it('omits trailing comma when last', () => {
      const tokens = jsonStrategy.arrLineTokens('item', undefined, ctx(true))
      const values = tokens.map(t => t.value)
      expect(values[values.length - 1]).not.toBe(',')
    })

    it('handles number items', () => {
      const tokens = jsonStrategy.arrLineTokens(42, undefined, ctx())
      const text = tokens.map(t => t.value).join('')
      expect(text).toContain('42')
    })
  })

  describe('propBlockTokens', () => {
    it('produces key: { for an object block', () => {
      const tokens = jsonStrategy.propBlockTokens(false, 'info', undefined, ctx())
      const text = tokens.map(t => t.value).join('')
      expect(text).toContain('"info"')
      expect(text).toContain(': ')
    })

    it('includes expanded brace for object', () => {
      const tokens = jsonStrategy.propBlockTokens(false, 'info', undefined, ctx())
      const expanded = tokens.filter(t => t.tags.includes('expanded'))
      expect(expanded.some(t => t.value === '{')).toBe(true)
    })

    it('includes collapsed {...} for object', () => {
      const tokens = jsonStrategy.propBlockTokens(false, 'info', undefined, ctx())
      const collapsed = tokens.filter(t => t.tags.includes('collapsed'))
      expect(collapsed.some(t => t.value.includes('{...}'))).toBe(true)
    })

    it('includes expanded bracket for array', () => {
      const tokens = jsonStrategy.propBlockTokens(true, 'items', undefined, ctx())
      const expanded = tokens.filter(t => t.tags.includes('expanded'))
      expect(expanded.some(t => t.value === '[')).toBe(true)
    })

    it('includes collapsed [...] for array', () => {
      const tokens = jsonStrategy.propBlockTokens(true, 'items', undefined, ctx())
      const collapsed = tokens.filter(t => t.tags.includes('collapsed'))
      expect(collapsed.some(t => t.value.includes('[...]'))).toBe(true)
    })

    it('collapsed token has comma when not last', () => {
      const tokens = jsonStrategy.propBlockTokens(false, 'info', undefined, ctx(false))
      const collapsed = tokens.filter(t => t.tags.includes('collapsed'))
      expect(collapsed.some(t => t.value.includes(','))).toBe(true)
    })

    it('collapsed token omits comma when last', () => {
      const tokens = jsonStrategy.propBlockTokens(false, 'info', undefined, ctx(true))
      const collapsed = tokens.filter(t => t.tags.includes('collapsed'))
      expect(collapsed.some(t => t.value.includes(','))).toBe(false)
    })
  })

  describe('beginBlockTokens', () => {
    it('returns { for object', () => {
      const tokens = jsonStrategy.beginBlockTokens(false, ctx())
      const expanded = tokens.filter(t => t.tags.includes('expanded'))
      expect(expanded.some(t => t.value === '{')).toBe(true)
    })

    it('returns [ for array', () => {
      const tokens = jsonStrategy.beginBlockTokens(true, ctx())
      const expanded = tokens.filter(t => t.tags.includes('expanded'))
      expect(expanded.some(t => t.value === '[')).toBe(true)
    })
  })

  describe('endBlockTokens', () => {
    it('returns } for object', () => {
      const tokens = jsonStrategy.endBlockTokens(false, ctx())
      expect(tokens.some(t => t.value.includes('}'))).toBe(true)
    })

    it('returns ] for array', () => {
      const tokens = jsonStrategy.endBlockTokens(true, ctx())
      expect(tokens.some(t => t.value.includes(']'))).toBe(true)
    })

    it('adds comma when not last', () => {
      const tokens = jsonStrategy.endBlockTokens(false, ctx(false))
      expect(tokens.some(t => t.value.includes(','))).toBe(true)
    })

    it('omits comma when last', () => {
      const tokens = jsonStrategy.endBlockTokens(false, ctx(true))
      expect(tokens.every(t => !t.value.includes(','))).toBe(true)
    })
  })

  describe('addBlockTokens', () => {
    it('appends Change tokens for blocks with diffs', () => {
      const block = new DiffBlockData(1, 0, [Token.Key('info')])
      block.diffs[0] = 3 // 3 breaking
      block.diffs[1] = 1 // 1 non-breaking

      jsonStrategy.addBlockTokens(block, false)

      const changeTokens = block.tokens.filter(t =>
        t.type === 'breaking' || t.type === 'non-breaking' || t.type === 'annotation' || t.type === 'unclassified'
      )
      expect(changeTokens.length).toBe(2)
      expect(changeTokens[0].value).toBe('3') // breaking
      expect(changeTokens[1].value).toBe('1') // non-breaking
    })

    it('adds collapsed tag to Change tokens', () => {
      const block = new DiffBlockData(1, 0, [Token.Key('info')])
      block.diffs[0] = 1

      jsonStrategy.addBlockTokens(block, false)

      const changeTokens = block.tokens.filter(t => t.type === 'breaking')
      expect(changeTokens.length).toBe(1)
      expect(changeTokens[0].tags).toContain('collapsed')
    })

    it('does nothing when block has no tokens', () => {
      const block = new DiffBlockData(1, 0, [])
      block.diffs[0] = 5

      jsonStrategy.addBlockTokens(block, false)
      expect(block.tokens.length).toBe(0)
    })

    it('does nothing when block has zero diffs', () => {
      const block = new DiffBlockData(1, 0, [Token.Key('info')])
      const initialLen = block.tokens.length

      jsonStrategy.addBlockTokens(block, false)
      expect(block.tokens.length).toBe(initialLen)
    })
  })
})
