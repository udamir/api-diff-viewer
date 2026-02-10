import type { Meta, StoryObj } from '@storybook/html-vite'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/DOM Structure',
  render: renderDiffViewer as any,
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side',
    format: 'yaml',
    wordDiffMode: 'word',
  },
}

export default meta
type Story = StoryObj<Args>

export const SideBySideHasTwoEditors: Story = {
  name: 'Side-by-side has two editors',
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)
    const editors = container.querySelectorAll('.cm-editor')
    expect(editors.length).toBe(2)
  },
}

export const InlineHasSingleEditor: Story = {
  name: 'Inline has single editor',
  args: { mode: 'inline' },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)
    const editors = container.querySelectorAll('.cm-editor')
    expect(editors.length).toBe(1)
  },
}

export const DiffLineDecorationsApplied: Story = {
  name: 'Diff line decorations are applied',
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    await waitFor(() => {
      const added = container.querySelectorAll('.cm-diff-line-added')
      const removed = container.querySelectorAll('.cm-diff-line-removed')
      const modified = container.querySelectorAll('.cm-diff-line-modified')
      expect(added.length + removed.length + modified.length).toBeGreaterThan(0)
    })
  },
}

export const SpacerLinesPresent: Story = {
  name: 'Spacer lines present in side-by-side',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    // Verify alignment: both editors have identical line count (spacers inserted)
    const views = viewer.getEditorViews()
    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()
    expect(views.before!.state.doc.lines).toBe(views.after!.state.doc.lines)

    // The docs should have MORE lines than just the real content lines,
    // meaning spacers were inserted to align the two sides
    expect(views.before!.state.doc.lines).toBeGreaterThan(10)
  },
}

export const WordDiffHighlightsPresent: Story = {
  name: 'Word diff highlights present',
  args: { wordDiffMode: 'word' },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    await waitFor(() => {
      const wordDiffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(wordDiffs.length).toBeGreaterThan(0)
    })
  },
}

export const BothEditorsEqualLineCount: Story = {
  name: 'Both editors have equal line count',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const views = viewer.getEditorViews()

    expect(views.before).toBeDefined()
    expect(views.after).toBeDefined()

    const beforeLines = views.before!.state.doc.lines
    const afterLines = views.after!.state.doc.lines
    expect(beforeLines).toBe(afterLines)
  },
}

export const GutterMarkersRendered: Story = {
  name: 'Gutter markers rendered',
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    await waitFor(() => {
      const markers = container.querySelectorAll('.cm-diff-marker')
      expect(markers.length).toBeGreaterThan(0)
    })
  },
}

export const ChangeSummaryValid: Story = {
  name: 'Change summary has valid structure',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    const summary = viewer.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)
    expect(summary.breaking).toBeGreaterThanOrEqual(0)
    expect(summary.nonBreaking).toBeGreaterThanOrEqual(0)
    expect(summary.annotation).toBeGreaterThanOrEqual(0)
    expect(summary.unclassified).toBeGreaterThanOrEqual(0)
    // Categorized changes should not exceed total
    const categorized = summary.breaking + summary.nonBreaking + summary.annotation + summary.unclassified
    expect(categorized).toBeLessThanOrEqual(summary.total)
    expect(categorized).toBeGreaterThan(0)
  },
}
