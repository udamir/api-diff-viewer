/**
 * Stories demonstrating the `extensions` option for injecting
 * native CodeMirror features (search, active line, selection match).
 */
import type { Meta, StoryFn } from '@storybook/html-vite'
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { highlightActiveLine, keymap } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

import { createDiffViewer, type DiffViewerOptions, type DiffViewer } from '../../src/index'
import openApiBefore from '../samples/openApi.before'
import openApiAfter from '../samples/openApi.after'

import '../../src/styles.css'

interface ExtensionsStoryArgs extends DiffViewerOptions {
  before: object
  after: object
}

function renderWithExtensions(extensions: Extension[]) {
  return (args: ExtensionsStoryArgs): HTMLElement => {
    const dark = args.dark ?? false

    const root = document.createElement('div')
    root.style.cssText =
      'display:flex;flex-direction:column;gap:8px;height:100vh;box-sizing:border-box;padding:8px'

    const hint = document.createElement('div')
    hint.style.cssText = `font-size:12px;color:${dark ? '#768390' : '#656d76'};font-family:system-ui`
    hint.textContent = 'Tip: Press Ctrl+F (Cmd+F on Mac) to open search in either panel.'
    root.appendChild(hint)

    const wrapper = document.createElement('div')
    wrapper.style.flex = '1'
    wrapper.style.minHeight = '0'
    wrapper.style.border = `1px solid ${dark ? '#30363d' : '#d0d7de'}`
    wrapper.style.borderRadius = '6px'
    wrapper.style.overflow = 'hidden'
    wrapper.style.position = 'relative'
    root.appendChild(wrapper)

    const { before, after, ...options } = args

    requestAnimationFrame(() => {
      const prev = (wrapper as any).__viewer as DiffViewer | undefined
      if (prev) {
        try { prev.destroy() } catch { /* noop */ }
      }

      try {
        const viewer = createDiffViewer(wrapper, before, after, {
          ...options,
          extensions,
          useWorker: false,
        })

        viewer.on('ready', ({ summary }) => {
          console.log(
            `[Extensions Story] Ready — ${summary.total} changes`
          )
        })

        viewer.on('error', ({ message }) => {
          console.error('[Extensions Story] Error:', message)
        })

        ;(wrapper as any).__viewer = viewer
      } catch (e) {
        console.error('[Extensions Story] Failed to create:', e)
        wrapper.textContent = `Error: ${e}`
      }
    })

    return root
  }
}

const allExtensions: Extension[] = [
  search(),
  keymap.of(searchKeymap),
  highlightActiveLine(),
  highlightSelectionMatches(),
]

const meta: Meta<ExtensionsStoryArgs> = {
  title: 'Tests/Extensions',
  argTypes: {
    mode: {
      control: 'radio',
      options: ['side-by-side', 'inline'],
    },
    format: {
      control: 'radio',
      options: ['yaml', 'json'],
    },
    dark: {
      control: 'boolean',
    },
  },
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side',
    format: 'yaml',
    dark: false,
    enableFolding: true,
    showClassification: true,
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

// ── Search + Active Line + Selection Match ──

export const AllFeatures = {
  name: 'Search + Active Line + Selection Match',
  render: renderWithExtensions(allExtensions) as StoryFn<ExtensionsStoryArgs>,
}

export const AllFeaturesDark = {
  name: 'All Features (Dark)',
  render: renderWithExtensions(allExtensions) as StoryFn<ExtensionsStoryArgs>,
  args: { dark: true },
}

export const AllFeaturesInline = {
  name: 'All Features (Inline)',
  render: renderWithExtensions(allExtensions) as StoryFn<ExtensionsStoryArgs>,
  args: { mode: 'inline' as const },
}

// ── Individual Features ──

export const SearchOnly = {
  name: 'Search Only',
  render: renderWithExtensions([
    search(),
    keymap.of(searchKeymap),
  ]) as StoryFn<ExtensionsStoryArgs>,
}

export const ActiveLineOnly = {
  name: 'Active Line Only',
  render: renderWithExtensions([
    highlightActiveLine(),
  ]) as StoryFn<ExtensionsStoryArgs>,
}

export const SelectionMatchOnly = {
  name: 'Selection Match Only',
  render: renderWithExtensions([
    highlightSelectionMatches(),
  ]) as StoryFn<ExtensionsStoryArgs>,
}

// ── No Extensions (baseline) ──

export const NoExtensions = {
  name: 'No Extensions (Baseline)',
  render: renderWithExtensions([]) as StoryFn<ExtensionsStoryArgs>,
}
