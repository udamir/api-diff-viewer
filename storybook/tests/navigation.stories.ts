import type { Meta, StoryFn, StoryObj } from '@storybook/html-vite'
import { expect, fn } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Navigation',
  render: renderDiffViewer as StoryFn<Args>,
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side',
    format: 'yaml',
  },
}

export default meta
type Story = StoryObj<Args>

export const GoToNextChange: Story = {
  name: 'goToNextChange cycles through changes',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    const summary = nav.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)

    // Navigate through changes — returns path strings
    const visited: string[] = []
    for (let i = 0; i < Math.min(summary.total, 5); i++) {
      const path = nav.goToNextChange()
      if (path) visited.push(path)
    }
    expect(visited.length).toBeGreaterThan(0)
    expect(typeof visited[0]).toBe('string')
  },
}

export const GoToPrevChange: Story = {
  name: 'goToPrevChange navigates backwards',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    // Go forward first
    nav.goToNextChange()

    // Then go back
    const prev = nav.goToPrevChange()
    expect(prev === null || typeof prev === 'string').toBe(true)
  },
}

export const GoToNextBreakingViaTypes: Story = {
  name: 'goToNextChange("breaking") navigates breaking changes',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    const summary = nav.getChangeSummary()
    if (summary.breaking === 0) return

    const path = nav.goToNextChange('breaking')
    expect(path).not.toBeNull()
    expect(typeof path).toBe('string')
  },
}

export const GoToPath: Story = {
  name: 'goToPath navigates to specific path',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    // Navigate to 'info' which should exist in any OpenAPI spec
    nav.goToPath('info')
    expect(nav.getCurrentPath()).toBe('info')
  },
}

export const GoToPathArray: Story = {
  name: 'goToPath with array form works',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    nav.goToPath(['info'])
    expect(nav.getCurrentPath()).toBe('info')
  },
}

export const GetChangeSummary: Story = {
  name: 'getChangeSummary counts changes',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const summary = viewer.navigation.getChangeSummary()

    // Total should equal sum of all types
    expect(summary.total).toBe(
      summary.breaking + summary.nonBreaking + summary.annotation + summary.unclassified
    )
    expect(summary.total).toBeGreaterThan(0)
  },
}

export const FindPaths: Story = {
  name: 'findPaths searches keys and values',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    // Search for 'info' which should match keys in the spec
    const results = nav.findPaths('info')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path).toBeDefined()
    expect(results[0].matchedText).toBeDefined()
    expect(results[0].matchLocation).toBeDefined()
  },
}

export const GetChildKeys: Story = {
  name: 'getChildKeys returns root-level keys',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    const keys = nav.getChildKeys()
    expect(keys.length).toBeGreaterThan(0)

    // Should contain typical OpenAPI root keys
    const keyNames = keys.map(k => k.key)
    expect(keyNames).toContain('openapi')
    expect(keyNames).toContain('info')
  },
}

export const GetChildKeysNested: Story = {
  name: 'getChildKeys drills into subtree',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    const keys = nav.getChildKeys('info')
    expect(keys.length).toBeGreaterThan(0)

    // Each key should have the correct path format
    for (const key of keys) {
      expect(key.path.startsWith('info/')).toBe(true)
    }
  },
}

export const GetCurrentPath: Story = {
  name: 'getCurrentPath tracks navigation',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    // Initially null
    expect(nav.getCurrentPath()).toBeNull()

    // After navigation, should be set
    nav.goToPath('info')
    expect(nav.getCurrentPath()).toBe('info')
  },
}

export const NavigateCallback: Story = {
  name: 'onNavigate fires when navigating',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const nav = viewer.navigation

    const callback = fn()
    const unsub = nav.onNavigate(callback)

    nav.goToPath('info')
    expect(callback).toHaveBeenCalled()

    unsub()
  },
}
