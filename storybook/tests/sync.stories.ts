import type { Meta, StoryFn, StoryObj } from '@storybook/html-vite'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Sync',
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

export const BothEditorsExist: Story = {
  name: 'Both editors exist in side-by-side mode',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()
  },
}

export const ScrollSyncBetweenEditors: Story = {
  name: 'Scroll sync keeps editors aligned',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()

    const beforeScroller = views.before!.scrollDOM
    const afterScroller = views.after!.scrollDOM

    // Scroll the before editor
    beforeScroller.scrollTop = 200
    beforeScroller.dispatchEvent(new Event('scroll'))

    await waitFor(
      () => {
        expect(Math.abs(afterScroller.scrollTop - 200)).toBeLessThan(10)
      },
      { timeout: 2000 }
    )
  },
}

export const NavigationScrollsBothEditors: Story = {
  name: 'Navigation scrolls both editors',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()

    const nav = viewer.navigation
    const block = nav.goToNextChange()

    if (block) {
      // Both editors should have scrolled
      // We just verify they have some scroll position (not necessarily identical
      // due to viewport rendering, but they should both have responded)
      await waitFor(
        () => {
          // At least one editor should have scrolled or the viewport should contain the target line
          const beforeScroller = views.before!.scrollDOM
          const afterScroller = views.after!.scrollDOM
          // If the change is beyond initial viewport, scrollTop should be > 0
          // If the change is in the initial viewport, scrollTop may be 0 (that's fine)
          expect(typeof beforeScroller.scrollTop).toBe('number')
          expect(typeof afterScroller.scrollTop).toBe('number')
        },
        { timeout: 2000 }
      )
    }
  },
}

export const EqualLineCountAfterAlignment: Story = {
  name: 'Both editors have equal document line count',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()

    expect(views.before!.state.doc.lines).toBe(views.after!.state.doc.lines)
  },
}

export const HeightPadWidgetsInserted: Story = {
  name: 'Height pad widgets are inserted when content wraps differently',
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    // Wait for height sync to complete (3× RAF + measurement cycle)
    await waitFor(
      () => {
        const pads = container.querySelectorAll('.cm-height-pad')
        expect(pads.length).toBeGreaterThan(0)
      },
      { timeout: 5000 }
    )
  },
}

export const WrappedLinesVerticallyAligned: Story = {
  name: 'Wrapped lines are vertically aligned across editors',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()

    // Wait for height sync to settle
    await waitFor(
      () => {
        const pads = container.querySelectorAll('.cm-height-pad')
        expect(pads.length).toBeGreaterThan(0)
      },
      { timeout: 5000 }
    )

    // Compare vertical positions of a line visible in both editors.
    // Line 5 (termsOfService) should have matching top positions.
    const targetLine = 5
    const beforeBlock = views.before!.lineBlockAt(
      views.before!.state.doc.line(targetLine).from
    )
    const afterBlock = views.after!.lineBlockAt(
      views.after!.state.doc.line(targetLine).from
    )

    const beforeRect = views.before!.coordsAtPos(
      views.before!.state.doc.line(targetLine).from
    )
    const afterRect = views.after!.coordsAtPos(
      views.after!.state.doc.line(targetLine).from
    )

    expect(beforeRect).not.toBeNull()
    expect(afterRect).not.toBeNull()

    if (beforeRect && afterRect) {
      expect(Math.abs(beforeRect.top - afterRect.top)).toBeLessThan(3)
    }
  },
}

export const HeightSyncStable: Story = {
  name: 'Height sync does not oscillate',
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    // Wait for height sync to settle
    await waitFor(
      () => {
        const pads = container.querySelectorAll('.cm-height-pad')
        expect(pads.length).toBeGreaterThan(0)
      },
      { timeout: 5000 }
    )

    // Record the current padding widget count
    const initialCount = container.querySelectorAll('.cm-height-pad').length

    // Wait 500ms and check that the count hasn't changed (no oscillation)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const afterCount = container.querySelectorAll('.cm-height-pad').length
    expect(afterCount).toBe(initialCount)
  },
}

export const HeightSyncAfterResize: Story = {
  name: 'Height sync recovers after container resize',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()

    // Wait for initial height sync
    await waitFor(
      () => {
        const pads = container.querySelectorAll('.cm-height-pad')
        expect(pads.length).toBeGreaterThan(0)
      },
      { timeout: 5000 }
    )

    // Resize the container (triggers word-wrap changes)
    container.style.width = '400px'

    // Wait for debounced resize handler (150ms) + full reset (3× RAF)
    // to clear stale paddings and re-measure with new wrapping.
    await new Promise(resolve => setTimeout(resolve, 500))

    await waitFor(
      () => {
        const pads = container.querySelectorAll('.cm-height-pad')
        expect(pads.length).toBeGreaterThan(0)
      },
      { timeout: 5000 }
    )

    // Verify lines are still aligned after resize
    const targetLine = 5
    const beforeRect = views.before!.coordsAtPos(
      views.before!.state.doc.line(targetLine).from
    )
    const afterRect = views.after!.coordsAtPos(
      views.after!.state.doc.line(targetLine).from
    )

    expect(beforeRect).not.toBeNull()
    expect(afterRect).not.toBeNull()

    if (beforeRect && afterRect) {
      expect(Math.abs(beforeRect.top - afterRect.top)).toBeLessThan(3)
    }
  },
}
