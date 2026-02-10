import type { Meta, StoryObj } from '@storybook/html-vite'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Runtime Options',
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

export const SwitchModeAtRuntime: Story = {
  name: 'Switch mode side-by-side → inline → back',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // Side-by-side: 2 editors
    let editors = container.querySelectorAll('.cm-editor')
    expect(editors.length).toBe(2)

    viewer.setMode('inline')

    await waitFor(() => {
      editors = container.querySelectorAll('.cm-editor')
      expect(editors.length).toBe(1)
    })

    viewer.setMode('side-by-side')

    await waitFor(() => {
      editors = container.querySelectorAll('.cm-editor')
      expect(editors.length).toBe(2)
    })
  },
}

export const SwitchFormatAtRuntime: Story = {
  name: 'Switch format yaml → json',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // YAML should not start with {
    const getContent = () => {
      const content = container.querySelector('.cm-content')
      return content?.textContent ?? ''
    }

    viewer.setFormat('json')

    await waitFor(() => {
      expect(getContent()).toContain('{')
    })
  },
}

export const SwitchThemeAtRuntime: Story = {
  name: 'Switch theme light → dark → light',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    expect(viewer.isDark()).toBe(false)

    viewer.setTheme({ dark: true })
    expect(viewer.isDark()).toBe(true)

    viewer.setTheme({ dark: false })
    expect(viewer.isDark()).toBe(false)
  },
}

export const SwitchWordDiffModeAtRuntime: Story = {
  name: 'Switch wordDiffMode word → none → char',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // Word mode: should have word diff decorations
    await waitFor(() => {
      const wordDiffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(wordDiffs.length).toBeGreaterThan(0)
    })

    // None mode: no word diff decorations
    viewer.setWordDiffMode('none')

    await waitFor(() => {
      const wordDiffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(wordDiffs.length).toBe(0)
    })

    // Char mode: should have word diff decorations again
    viewer.setWordDiffMode('char')

    await waitFor(() => {
      const wordDiffs = container.querySelectorAll('.cm-diff-word-added, .cm-diff-word-removed')
      expect(wordDiffs.length).toBeGreaterThan(0)
    })
  },
}

export const ToggleFoldingAtRuntime: Story = {
  name: 'Toggle folding on and off',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // Initially folding is off
    viewer.setFoldingEnabled(true)

    await waitFor(() => {
      // Fold gutter should appear
      const foldGutter = container.querySelectorAll('.cm-foldGutter')
      expect(foldGutter.length).toBeGreaterThan(0)
    })

    viewer.setFoldingEnabled(false)

    await waitFor(() => {
      const foldGutter = container.querySelectorAll('.cm-foldGutter')
      expect(foldGutter.length).toBe(0)
    })
  },
}

export const ToggleClassificationAtRuntime: Story = {
  name: 'Toggle classification indicators',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    viewer.setClassificationEnabled(true)

    await waitFor(() => {
      // Classification type gutter should appear
      const typeGutter = container.querySelectorAll('.cm-diff-type-gutter')
      expect(typeGutter.length).toBeGreaterThan(0)
    })

    viewer.setClassificationEnabled(false)

    await waitFor(() => {
      const typeGutter = container.querySelectorAll('.cm-diff-type-gutter')
      expect(typeGutter.length).toBe(0)
    })
  },
}

export const ToggleWordWrapAtRuntime: Story = {
  name: 'Toggle word wrap on and off',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // Initially word wrap is on
    expect(viewer.getWordWrap()).toBe(true)

    // Disable word wrap
    viewer.setWordWrap(false)
    expect(viewer.getWordWrap()).toBe(false)

    // Content should not be wrapping — cm-lineWrapping class removed
    await waitFor(() => {
      const editors = container.querySelectorAll('.cm-editor')
      for (const editor of editors) {
        expect(editor.querySelector('.cm-content.cm-lineWrapping')).toBeNull()
      }
    })

    // Re-enable word wrap
    viewer.setWordWrap(true)
    expect(viewer.getWordWrap()).toBe(true)

    await waitFor(() => {
      const editors = container.querySelectorAll('.cm-editor')
      for (const editor of editors) {
        expect(editor.querySelector('.cm-content.cm-lineWrapping')).not.toBeNull()
      }
    })
  },
}

export const GettersReflectState: Story = {
  name: 'Getters reflect state after mutations',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    expect(viewer.getMode()).toBe('side-by-side')
    expect(viewer.getFormat()).toBe('yaml')
    expect(viewer.isDark()).toBe(false)
    expect(viewer.getWordWrap()).toBe(true)

    viewer.setMode('inline')
    viewer.setFormat('json')
    viewer.setTheme({ dark: true })
    viewer.setWordWrap(false)

    expect(viewer.getMode()).toBe('inline')
    expect(viewer.getFormat()).toBe('json')
    expect(viewer.isDark()).toBe(true)
    expect(viewer.getWordWrap()).toBe(false)
  },
}

export const SetFiltersReducesVisibleChanges: Story = {
  name: 'setFilters limits displayed change types',
  play: async ({ canvasElement }) => {
    const { viewer, container } = await waitForViewer(canvasElement)

    // Measure visible height before filtering
    const editorsBefore = container.querySelectorAll('.cm-content')
    const heightBefore = Array.from(editorsBefore).reduce((sum, el) => sum + el.scrollHeight, 0)

    // Set filters to only breaking — non-matching blocks should be folded
    viewer.setFilters(['breaking'])
    expect(viewer.getFilters()).toEqual(['breaking'])

    // Visible content should be reduced (folded blocks take less space)
    const editorsAfter = container.querySelectorAll('.cm-content')
    const heightAfter = Array.from(editorsAfter).reduce((sum, el) => sum + el.scrollHeight, 0)
    expect(heightAfter).toBeLessThan(heightBefore)

    // Restore — content should expand back
    viewer.setFilters([])
    expect(viewer.getFilters().length).toBe(0)

    const editorsRestored = container.querySelectorAll('.cm-content')
    const heightRestored = Array.from(editorsRestored).reduce((sum, el) => sum + el.scrollHeight, 0)
    expect(heightRestored).toBeGreaterThan(heightAfter)
  },
}
