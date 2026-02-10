import type { Meta, StoryObj } from '@storybook/html-vite'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Word Diff',
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

export const WordModeHighlights: Story = {
  name: 'Word mode produces word-level highlights',
  args: { wordDiffMode: 'word' },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    await waitFor(() => {
      const wordDiffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(wordDiffs.length).toBeGreaterThan(0)
    })
  },
}

export const CharModeHighlights: Story = {
  name: 'Char mode produces character-level highlights',
  args: { wordDiffMode: 'char' },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    await waitFor(() => {
      const wordDiffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(wordDiffs.length).toBeGreaterThan(0)
    })
  },
}

export const NoneModeNoHighlights: Story = {
  name: 'None mode has no word-level highlights',
  args: { wordDiffMode: 'none' },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    // Wait for render to complete
    await waitFor(() => {
      const editors = container.querySelectorAll('.cm-editor')
      expect(editors.length).toBeGreaterThan(0)
    })

    // No word-level highlights should exist
    const wordHighlights = container.querySelectorAll(
      '.cm-diff-word-added, .cm-diff-word-removed'
    )
    expect(wordHighlights.length).toBe(0)
  },
}

export const SwitchBetweenWordDiffModes: Story = {
  name: 'Switching word diff modes updates highlights',
  args: { wordDiffMode: 'word' },
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // Word mode: highlights present
    await waitFor(() => {
      const diffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(diffs.length).toBeGreaterThan(0)
    })

    // Switch to none: no highlights
    viewer.setWordDiffMode('none')
    await waitFor(() => {
      const diffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(diffs.length).toBe(0)
    })

    // Switch to char: highlights return
    viewer.setWordDiffMode('char')
    await waitFor(() => {
      const diffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(diffs.length).toBeGreaterThan(0)
    })
  },
}

export const InlineWordDiffMode: Story = {
  name: 'Inline mode with word diff shows decorations',
  args: { mode: 'inline', wordDiffMode: 'word' },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    // Inline mode should have single editor
    const editors = container.querySelectorAll('.cm-editor')
    expect(editors.length).toBe(1)

    // Should have some diff decorations
    await waitFor(() => {
      const diffLines = container.querySelectorAll(
        '.cm-diff-line-added, .cm-diff-line-removed, .cm-diff-line-modified'
      )
      expect(diffLines.length).toBeGreaterThan(0)
    })
  },
}

export const InlineNoneMode: Story = {
  name: 'Inline mode with none shows separate lines',
  args: { mode: 'inline', wordDiffMode: 'none' },
  play: async ({ canvasElement }) => {
    const { container } = await waitForViewer(canvasElement)

    // No word-level highlights
    await waitFor(() => {
      const editors = container.querySelectorAll('.cm-editor')
      expect(editors.length).toBe(1)
    })

    const wordHighlights = container.querySelectorAll(
      '.cm-diff-word-added, .cm-diff-word-removed'
    )
    expect(wordHighlights.length).toBe(0)
  },
}
