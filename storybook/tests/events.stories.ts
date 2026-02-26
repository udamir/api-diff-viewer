import type { Meta, StoryFn, StoryObj } from '@storybook/html-vite'
import { expect, fn, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Events',
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

export const ReadyEventSummary: Story = {
  name: 'Ready produces valid ChangeSummary',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    // In sync mode, ready already fired via queueMicrotask.
    // getChangeSummary() should be populated.
    const summary = viewer.getChangeSummary()
    expect(summary).toBeDefined()
    expect(summary.total).toBeGreaterThan(0)
    expect(typeof summary.breaking).toBe('number')
    expect(typeof summary.nonBreaking).toBe('number')
    expect(typeof summary.annotation).toBe('number')
    expect(typeof summary.unclassified).toBe('number')
    // Categorized changes should not exceed total
    const categorized = summary.breaking + summary.nonBreaking + summary.annotation + summary.unclassified
    expect(categorized).toBeLessThanOrEqual(summary.total)
    expect(categorized).toBeGreaterThan(0)
  },
}

export const ModeChangeEventFires: Story = {
  name: 'modeChange event fires on setMode',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    let firedEvent: any = null
    viewer.on('modeChange', (data) => {
      firedEvent = data
    })

    viewer.setMode('inline')
    expect(firedEvent).toEqual({ mode: 'inline' })
  },
}

export const FormatChangeEventFires: Story = {
  name: 'formatChange event fires on setFormat',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    let firedEvent: any = null
    viewer.on('formatChange', (data) => {
      firedEvent = data
    })

    viewer.setFormat('json')
    expect(firedEvent).toEqual({ format: 'json' })
  },
}

export const ThemeChangeEventFires: Story = {
  name: 'themeChange event fires on setTheme',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    let firedEvent: any = null
    viewer.on('themeChange', (data) => {
      firedEvent = data
    })

    viewer.setTheme({ dark: true })
    expect(firedEvent).toEqual({ dark: true })
  },
}

export const WordWrapChangeEventFires: Story = {
  name: 'wordWrapChange event fires on setWordWrap',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    let firedEvent: any = null
    viewer.on('wordWrapChange', (data) => {
      firedEvent = data
    })

    viewer.setWordWrap(false)
    expect(firedEvent).toEqual({ wordWrap: false })
  },
}

export const MultipleListeners: Story = {
  name: 'Multiple listeners all receive events',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    const h1 = fn()
    const h2 = fn()
    viewer.on('modeChange', h1)
    viewer.on('modeChange', h2)

    viewer.setMode('inline')

    expect(h1).toHaveBeenCalledWith({ mode: 'inline' })
    expect(h2).toHaveBeenCalledWith({ mode: 'inline' })
  },
}

export const UnsubscribeWorks: Story = {
  name: 'Unsubscribe prevents handler from being called',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    const handler = fn()
    const unsub = viewer.on('modeChange', handler)
    unsub()

    viewer.setMode('inline')

    expect(handler).not.toHaveBeenCalled()
  },
}

export const SetModeNoOpWhenSame: Story = {
  name: 'setMode is a no-op when mode unchanged',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    const handler = fn()
    viewer.on('modeChange', handler)

    // mode is already 'side-by-side'
    viewer.setMode('side-by-side')

    expect(handler).not.toHaveBeenCalled()
  },
}

export const SetFormatNoOpWhenSame: Story = {
  name: 'setFormat is a no-op when format unchanged',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    const handler = fn()
    viewer.on('formatChange', handler)

    // format is already 'yaml'
    viewer.setFormat('yaml')

    expect(handler).not.toHaveBeenCalled()
  },
}

export const SetWordWrapNoOpWhenSame: Story = {
  name: 'setWordWrap is a no-op when wordWrap unchanged',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    const handler = fn()
    viewer.on('wordWrapChange', handler)

    // wordWrap is already true
    viewer.setWordWrap(true)

    expect(handler).not.toHaveBeenCalled()
  },
}
