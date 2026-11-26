import type { Meta, StoryFn, StoryObj } from '@storybook/html-vite'
import { foldedRanges } from '@codemirror/language'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Folding',
  render: renderDiffViewer as StoryFn<Args>,
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side',
    format: 'yaml',
    enableFolding: true,
    showClassification: true,
  },
}

export default meta
type Story = StoryObj<Args>

export const FoldGutterPresent: Story = {
  name: 'Fold gutter is present when folding enabled',
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    const foldGutter = container.querySelectorAll('.cm-foldGutter')
    expect(foldGutter.length).toBeGreaterThan(0)
  },
}

export const NoFoldGutterWhenDisabled: Story = {
  name: 'No fold gutter when folding disabled',
  args: { enableFolding: false },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    const foldGutter = container.querySelectorAll('.cm-foldGutter')
    expect(foldGutter.length).toBe(0)
  },
}

export const CollapseAllDoesNotCrash: Story = {
  name: 'collapseAll() does not throw',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    // Should not throw
    viewer.collapseAll()

    // Viewer should still be functional after collapse
    const summary = viewer.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)
  },
}

export const ExpandAllDoesNotCrash: Story = {
  name: 'expandAll() does not throw',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    // Collapse first, then expand
    viewer.collapseAll()
    viewer.expandAll()

    // Viewer should still be functional
    const summary = viewer.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)
  },
}

export const TogglePathDoesNotCrash: Story = {
  name: 'togglePath() does not throw',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    // Toggle 'info' path — should not throw
    viewer.togglePath('info')

    // Toggle again — should restore
    viewer.togglePath('info')

    // Viewer still functional
    const views = viewer.getEditorViews()
    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()
  },
}

export const FoldingWithClassification: Story = {
  name: 'Classification badges appear with folding + classification',
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    // Classification type gutter should be present
    await waitFor(() => {
      const typeGutter = container.querySelectorAll('.cm-diff-type-gutter')
      expect(typeGutter.length).toBeGreaterThan(0)
    })
  },
}

/** Collects the messages CodeMirror logs through console.error (exceptions thrown inside update listeners) */
function captureConsoleErrors(): { messages: string[]; restore: () => void } {
  const messages: string[] = []
  const original = console.error
  console.error = (...args: unknown[]) => {
    messages.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' '))
    original.apply(console, args)
  }
  return { messages, restore: () => { console.error = original } }
}

/** Waits for the deferred fold sync (re-enabled in requestAnimationFrame) */
const nextFrames = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

export const CollapseAllSideBySideNoErrors: Story = {
  name: 'collapseAll() in side-by-side mode logs no errors and folds both editors alike',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    await nextFrames()
    const { messages, restore } = captureConsoleErrors()
    try {
      viewer.collapseAll()
      await nextFrames()
      viewer.expandAll()
      await nextFrames()
      viewer.collapseAll()
      await nextFrames()
    } finally {
      restore()
    }
    expect(messages).toEqual([])
    const { before, after } = viewer.getEditorViews()
    expect(foldedRanges(before!.state).size).toBeGreaterThan(0)
    expect(foldedRanges(after!.state).size).toBeGreaterThan(0)
  },
}

export const FilterSideBySideNoErrors: Story = {
  name: 'setFilters() in side-by-side mode logs no errors',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    await nextFrames()
    const { messages, restore } = captureConsoleErrors()
    try {
      for (const filters of [['breaking'], ['non-breaking'], ['annotation', 'breaking'], [], ['deprecated'], []] as const) {
        viewer.setFilters([...filters])
        await nextFrames()
      }
    } finally {
      restore()
    }
    expect(messages).toEqual([])
  },
}
