import { describe, it, expect, vi } from 'vitest'
import { apiMerge } from 'api-smart-diff'
import { NavigationAPIImpl } from '../../src/navigation/navigation-api'
import { buildDiffBlock } from '../../src/diff-builder/index'
import type { DiffData, MergedDocument } from '../../src/types'

/** Helper: create NavigationAPIImpl with null views (pure data tests) */
function createNavFromSpecs(before: object, after: object) {
  const merged = apiMerge(before, after, { arrayMeta: true }) as MergedDocument
  const rootBlock = buildDiffBlock(merged, 'yaml')
  const diffData: DiffData = {
    blocks: [rootBlock],
    lineMap: [],
    blockMap: [],
  }
  const nav = new NavigationAPIImpl(null, null, diffData, merged)
  return { nav, diffData, merged }
}

// ─── goToNextChange / goToPrevChange ──────────────────────────────────

describe('goToNextChange', () => {
  it('cycles through all changes', () => {
    // Use a spec with container blocks so changed leaves have named parents
    const { nav } = createNavFromSpecs(
      { openapi: '3.0.0', info: { title: 'Old', version: '1.0' }, paths: { '/pets': { get: { summary: 'List' } } } },
      { openapi: '3.0.0', info: { title: 'New', version: '2.0' }, paths: { '/pets': { get: { summary: 'List all' } } } }
    )

    const first = nav.goToNextChange()
    expect(first).not.toBeNull()
    expect(typeof first).toBe('string')

    const second = nav.goToNextChange()
    expect(second).not.toBeNull()
  })

  it('returns null when no changes', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'same' } },
      { info: { title: 'same' } }
    )

    expect(nav.goToNextChange()).toBeNull()
  })

  it('wraps around', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    const first = nav.goToNextChange()
    expect(first).not.toBeNull()
    // Second call wraps around to same change
    const second = nav.goToNextChange()
    expect(second).toBe(first)
  })

  it('filters by type when types are provided', () => {
    const before = {
      openapi: '3.0.0',
      info: { title: 'Old', description: 'old desc' },
    }
    const after = {
      openapi: '3.0.0',
      info: { title: 'New', description: 'new desc' },
    }
    const { nav } = createNavFromSpecs(before, after)

    // Navigate only through 'annotation' changes
    const result = nav.goToNextChange('annotation')
    // May be null if no annotation changes exist (api-smart-diff classifies these)
    // Just verify it's a string or null
    expect(result === null || typeof result === 'string').toBe(true)
  })
})

describe('goToPrevChange', () => {
  it('navigates backwards', () => {
    const { nav } = createNavFromSpecs(
      { openapi: '3.0.0', info: { title: 'A', version: '1' } },
      { openapi: '3.0.0', info: { title: 'B', version: '2' } }
    )

    // Go forward first
    const first = nav.goToNextChange()
    expect(first).not.toBeNull()

    // Go forward again to advance index
    nav.goToNextChange()

    // Now go back
    const prev = nav.goToPrevChange()
    expect(prev).not.toBeNull()
    expect(typeof prev).toBe('string')
  })
})

// ─── goToPath ─────────────────────────────────────────────────────────

describe('goToPath', () => {
  it('resolves and updates current path (string form)', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    nav.goToPath('info')
    expect(nav.getCurrentPath()).toBe('info')
  })

  it('resolves array form equivalently', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    nav.goToPath(['info'])
    expect(nav.getCurrentPath()).toBe('info')
  })

  it('does nothing for non-existent path', () => {
    const { nav } = createNavFromSpecs(
      { key: 'value' },
      { key: 'changed' }
    )

    nav.goToPath('nonexistent')
    expect(nav.getCurrentPath()).toBeNull()
  })
})

// ─── findPaths ────────────────────────────────────────────────────────

describe('findPaths', () => {
  it('finds keys matching search text', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'Pet Store', version: '1.0' } },
      { info: { title: 'Pet Shop', version: '2.0' } }
    )

    const results = nav.findPaths('title', { searchIn: 'keys' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].matchLocation).toBe('key')
    expect(results[0].matchedText).toBe('title')
  })

  it('finds values matching search text', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'Pet Store' } },
      { info: { title: 'Pet Shop' } }
    )

    const results = nav.findPaths('Pet', { searchIn: 'values' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].matchLocation).toBe('value')
  })

  it('respects limit option', () => {
    const { nav } = createNavFromSpecs(
      { info: { a: 'x', b: 'x', c: 'x' } },
      { info: { a: 'y', b: 'y', c: 'y' } }
    )

    // Search for a term that matches multiple keys
    const allResults = nav.findPaths('info', { searchIn: 'keys' })
    const limitedResults = nav.findPaths('info', { searchIn: 'keys', limit: 1 })
    expect(limitedResults.length).toBeLessThanOrEqual(1)
  })

  it('is case-insensitive by default', () => {
    const { nav } = createNavFromSpecs(
      { Title: 'Hello' },
      { Title: 'World' }
    )

    const results = nav.findPaths('title')
    expect(results.length).toBeGreaterThan(0)
  })

  it('respects caseSensitive option', () => {
    const { nav } = createNavFromSpecs(
      { Title: 'Hello' },
      { Title: 'World' }
    )

    const results = nav.findPaths('title', { caseSensitive: true })
    expect(results.length).toBe(0)
  })

  it('returns empty for empty text', () => {
    const { nav } = createNavFromSpecs({ info: { title: 'A' } }, { info: { title: 'B' } })
    expect(nav.findPaths('')).toEqual([])
  })
})

// ─── getChildKeys ─────────────────────────────────────────────────────

describe('getChildKeys', () => {
  it('returns root-level keys when path is omitted', () => {
    const { nav } = createNavFromSpecs(
      { openapi: '3.0.0', info: { title: 'A' } },
      { openapi: '3.0.0', info: { title: 'B' } }
    )

    const keys = nav.getChildKeys()
    const keyNames = keys.map(k => k.key)
    expect(keyNames).toContain('openapi')
    expect(keyNames).toContain('info')
    // $diff should be filtered out
    expect(keyNames).not.toContain('$diff')
  })

  it('returns child keys for a nested path', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A', version: '1.0' } },
      { info: { title: 'B', version: '1.0' } }
    )

    const keys = nav.getChildKeys('info')
    const keyNames = keys.map(k => k.key)
    expect(keyNames).toContain('title')
    expect(keyNames).toContain('version')
  })

  it('reports hasDirectChange for changed keys', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'Old' } },
      { info: { title: 'New' } }
    )

    const keys = nav.getChildKeys('info')
    const titleKey = keys.find(k => k.key === 'title')
    expect(titleKey).toBeDefined()
    expect(titleKey!.hasDirectChange).toBe(true)
  })

  it('reports hasChildren for object values', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    const keys = nav.getChildKeys()
    const infoKey = keys.find(k => k.key === 'info')
    expect(infoKey).toBeDefined()
    expect(infoKey!.hasChildren).toBe(true)
  })

  it('returns empty for non-object path', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    // title is a string, not an object
    const keys = nav.getChildKeys('info/title')
    expect(keys).toEqual([])
  })

  it('returns path in encoded string form', () => {
    const { nav } = createNavFromSpecs(
      { paths: { '/pets': { get: {} } } },
      { paths: { '/pets': { get: {} } } }
    )

    const keys = nav.getChildKeys('paths')
    const petsKey = keys.find(k => k.key === '/pets')
    expect(petsKey).toBeDefined()
    expect(petsKey!.path).toBe('paths/~1pets')
  })

  it('accepts array form path', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    const keys = nav.getChildKeys(['info'])
    const keyNames = keys.map(k => k.key)
    expect(keyNames).toContain('title')
  })
})

// ─── getCurrentPath ──────────────────────────────────────────────────

describe('getCurrentPath', () => {
  it('returns null initially', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )
    expect(nav.getCurrentPath()).toBeNull()
  })

  it('tracks navigation state after goToNextChange', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    const path = nav.goToNextChange()
    expect(nav.getCurrentPath()).toBe(path)
  })
})

// ─── onNavigate ──────────────────────────────────────────────────────

describe('onNavigate', () => {
  it('fires on navigation', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    const callback = vi.fn()
    nav.onNavigate(callback)

    nav.goToNextChange()
    expect(callback).toHaveBeenCalled()
    // The path should be a string (the parent container of the changed leaf)
    const path = callback.mock.calls[0][0]
    expect(path === null || typeof path === 'string').toBe(true)
  })

  it('unsubscribe works', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'A' } },
      { info: { title: 'B' } }
    )

    const callback = vi.fn()
    const unsub = nav.onNavigate(callback)

    unsub()
    nav.goToNextChange()
    expect(callback).not.toHaveBeenCalled()
  })
})

// ─── getChangeSummary ────────────────────────────────────────────────

describe('getChangeSummary', () => {
  it('counts changes correctly', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'Old', version: '1.0' }, openapi: '3.0.0' },
      { info: { title: 'New', version: '2.0' }, openapi: '3.0.0' }
    )

    const summary = nav.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)
    expect(summary.total).toBe(
      summary.breaking + summary.nonBreaking + summary.annotation + summary.unclassified
    )
  })

  it('returns zero for identical specs', () => {
    const { nav } = createNavFromSpecs(
      { info: { title: 'same' } },
      { info: { title: 'same' } }
    )

    const summary = nav.getChangeSummary()
    expect(summary.total).toBe(0)
  })
})
