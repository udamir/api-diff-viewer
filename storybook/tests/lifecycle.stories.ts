import type { Meta, StoryObj } from '@storybook/html-vite'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import { createDiffViewer } from '../../src/index'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Lifecycle',
  render: renderDiffViewer as any,
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side',
    format: 'yaml',
  },
}

export default meta
type Story = StoryObj<Args>

export const DestroyRemovesEditors: Story = {
  name: 'destroy() cleans up editors',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // Should have editors before destroy
    let editors = container.querySelectorAll('.cm-editor')
    expect(editors.length).toBeGreaterThan(0)

    viewer.destroy()

    // After destroy, internal state should be cleaned
    // The DOM may still exist but getEditorViews should return empty
    const views = viewer.getEditorViews()
    expect(views.before).toBeUndefined()
    expect(views.after).toBeUndefined()
    expect(views.unified).toBeUndefined()
  },
}

export const DestroyPreventsSubsequentOperations: Story = {
  name: 'Operations after destroy() are no-ops',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    viewer.destroy()

    // None of these should throw
    viewer.setMode('inline')
    viewer.setFormat('json')
    viewer.setTheme({ dark: true })
    viewer.setWordDiffMode('char')
    viewer.setFoldingEnabled(true)
    viewer.setClassificationEnabled(true)
    viewer.update({}, {})
    viewer.expandAll()
    viewer.collapseAll()
  },
}

export const DoubleDestroyIsSafe: Story = {
  name: 'Double destroy() does not throw',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    viewer.destroy()
    // Second destroy should be a no-op
    viewer.destroy()
  },
}

export const GetEditorViewsSideBySide: Story = {
  name: 'getEditorViews returns before/after in side-by-side',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()
    expect(views.unified).toBeUndefined()
  },
}

export const GetEditorViewsInline: Story = {
  name: 'getEditorViews returns unified in inline mode',
  args: { mode: 'inline' },
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.unified).toBeDefined()
    expect(views.before).toBeUndefined()
    expect(views.after).toBeUndefined()
  },
}

export const DestroyAndRecreate: Story = {
  name: 'Can create new viewer after destroy',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    viewer.destroy()

    // Create a new viewer in the same container
    const viewer2 = createDiffViewer(container, openApiBefore, openApiAfter, {
      useWorker: false,
    })

    await waitFor(() => {
      const editors = container.querySelectorAll('.cm-editor')
      expect(editors.length).toBeGreaterThan(0)
    })

    const summary = viewer2.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)

    viewer2.destroy()
  },
}

export const GetModeAndFormat: Story = {
  name: 'getMode/getFormat return current values',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    expect(viewer.getMode()).toBe('side-by-side')
    expect(viewer.getFormat()).toBe('yaml')

    viewer.setMode('inline')
    expect(viewer.getMode()).toBe('inline')

    viewer.setFormat('json')
    expect(viewer.getFormat()).toBe('json')
  },
}

export const IsDarkReflectsState: Story = {
  name: 'isDark() reflects theme state',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    expect(viewer.isDark()).toBe(false)

    viewer.setTheme({ dark: true })
    expect(viewer.isDark()).toBe(true)

    viewer.setTheme({ dark: false })
    expect(viewer.isDark()).toBe(false)
  },
}
