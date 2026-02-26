import type { Meta, StoryFn } from '@storybook/html-vite'
import type { DiffType } from 'api-smart-diff'
import { createDiffViewer, type DiffViewerOptions, type DiffViewer } from '../src/index'
import openApiBefore from './samples/openApi.before'
import openApiAfter from './samples/openApi.after'
import jsonSchemaBefore from './samples/jsonSchema.before'
import jsonSchemaAfter from './samples/jsonSchema.after'
import asyncApiBefore from './samples/asyncApi.before'
import asyncApiAfter from './samples/asyncApi.after'

import '../src/styles.css'

interface DiffViewerStoryArgs extends DiffViewerOptions {
  before: object
  after: object
}

interface ClassificationDef {
  key: DiffType
  label: string
  color: [light: string, dark: string]
  bg: [light: string, dark: string]
}

const CLASSIFICATIONS: ClassificationDef[] = [
  { key: 'breaking',      label: 'Breaking',     color: ['#cf222e', '#f85149'], bg: ['#ffebe9', '#490202'] },
  { key: 'non-breaking',  label: 'Non-breaking',  color: ['#1a7f37', '#3fb950'], bg: ['#dafbe1', '#04260f'] },
  { key: 'annotation',    label: 'Annotation',   color: ['#8250df', '#a371f7'], bg: ['#f0e6ff', '#2a1a4e'] },
  { key: 'unclassified',  label: 'Unclassified', color: ['#656d76', '#768390'], bg: ['#eaeef2', '#21262d'] },
]

const viewerStore = new WeakMap<HTMLElement, DiffViewer>()
const badgeStore = new WeakMap<HTMLElement, Map<string, HTMLElement>>()

function createActionBar(wrapper: HTMLElement, dark: boolean): HTMLElement {
  const bar = document.createElement('div')
  bar.style.cssText = 'display:flex;gap:8px;font-size:12px;align-items:center;flex-wrap:wrap'

  const d = dark ? 1 : 0
  const borderColor = dark ? '#30363d' : '#d0d7de'
  const bg = dark ? '#21262d' : '#fff'
  const color = dark ? '#e6edf3' : '#24292f'
  const mutedColor = dark ? '#768390' : '#656d76'

  const makeBtn = (label: string, fn: (viewer: DiffViewer) => void) => {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.type = 'button'
    btn.style.cssText =
      `padding:4px 12px;border:1px solid ${borderColor};border-radius:4px;` +
      `background:${bg};color:${color};cursor:pointer;font-size:12px;font-family:inherit`
    btn.addEventListener('click', () => {
      const viewer = viewerStore.get(wrapper)
      if (viewer) fn(viewer)
    })
    return btn
  }

  bar.append(
    makeBtn('Expand All', (v) => v.expandAll()),
    makeBtn('Collapse All', (v) => v.collapseAll()),
  )

  // Separator
  const sep2 = document.createElement('span')
  sep2.style.cssText = `width:1px;height:16px;background:${borderColor}`
  bar.appendChild(sep2)

  // Classification counters (populated on ready)
  const badges = new Map<string, HTMLElement>()

  for (const cls of CLASSIFICATIONS) {
    const badge = document.createElement('button')
    badge.type = 'button'
    badge.style.cssText =
      `padding:3px 8px;border:1px solid ${borderColor};border-radius:10px;` +
      `background:${bg};color:${mutedColor};cursor:pointer;font-size:11px;` +
      `font-family:inherit;display:inline-flex;align-items:center;gap:4px;opacity:0.5`
    const dot = document.createElement('span')
    dot.style.cssText =
      `width:8px;height:8px;border-radius:50%;background:${cls.color[d]}`
    const text = document.createElement('span')
    text.textContent = `${cls.label}: -`
    badge.append(dot, text)
    badges.set(cls.key, badge)

    badge.addEventListener('click', () => {
      const viewer = viewerStore.get(wrapper)
      if (!viewer) return

      const filters = viewer.getFilters()
      if (filters.includes(cls.key)) {
        filters.splice(filters.indexOf(cls.key), 1)
      } else {
        filters.push(cls.key)
      }

      // Update visual state for all badges
      for (const [key, el] of badges) {
        const active = filters.includes(key as DiffType)
        const c = CLASSIFICATIONS.find(c => c.key === key)!
        if (filters.length === 0) {
          el.style.background = bg
          el.style.color = mutedColor
          el.style.borderColor = borderColor
        } else if (active) {
          el.style.background = c.bg[d]
          el.style.color = c.color[d]
          el.style.borderColor = c.color[d]
        } else {
          el.style.background = bg
          el.style.color = mutedColor
          el.style.borderColor = borderColor
          el.style.opacity = '0.4'
        }
        el.style.opacity = (filters.length === 0 || active) ? '1' : '0.4'
      }

      viewer.setFilters([...filters])
    })

    bar.appendChild(badge)
  }

  // Store badges ref so renderDiffViewer can update counts
  badgeStore.set(bar, badges)

  return bar
}

function renderDiffViewer(args: DiffViewerStoryArgs): HTMLElement {
  const dark = args.dark ?? false

  const root = document.createElement('div')
  root.style.cssText = 'display:flex;flex-direction:column;gap:8px;height:100vh;box-sizing:border-box;padding:8px'

  const wrapper = document.createElement('div')
  wrapper.style.flex = '1'
  wrapper.style.minHeight = '0'
  wrapper.style.border = `1px solid ${dark ? '#30363d' : '#d0d7de'}`
  wrapper.style.borderRadius = '6px'
  wrapper.style.overflow = 'hidden'
  wrapper.style.position = 'relative'

  const actionBar = createActionBar(wrapper, dark)
  root.appendChild(actionBar)
  root.appendChild(wrapper)

  const { before, after, ...options } = args

  // Use requestAnimationFrame to ensure the wrapper is attached to the DOM
  // before creating the viewer (CodeMirror needs a mounted parent)
  requestAnimationFrame(() => {
    // Destroy any previous viewer stored on this element
    const prev = viewerStore.get(wrapper)
    if (prev) {
      try { prev.destroy() } catch { /* noop */ }
    }

    try {
      const viewer = createDiffViewer(wrapper, before, after, {
        ...options,
        useWorker: false, // sync in storybook for reliability
      })

      viewer.on('ready', ({ summary }) => {
        console.log(
          `[DiffViewer] Ready — ${summary.total} changes ` +
          `(${summary.breaking} breaking, ${summary.nonBreaking} non-breaking)`
        )

        // Update classification badges
        const badges = badgeStore.get(actionBar)
        if (badges) {
          const counts: Record<string, number> = {
            breaking: summary.breaking,
            'non-breaking': summary.nonBreaking,
            annotation: summary.annotation,
            unclassified: summary.unclassified,
          }
          for (const [key, el] of badges) {
            const count = counts[key] ?? 0
            const text = el.querySelector('span:last-child')
            if (text) {
              const cls = CLASSIFICATIONS.find(c => c.key === key)!
              text.textContent = `${cls.label}: ${count}`
            }
            el.style.opacity = count > 0 ? '1' : '0.5'
          }
        }
      })

      viewer.on('error', ({ message }) => {
        console.error('[DiffViewer] Error:', message)
      })

      viewerStore.set(wrapper, viewer)
    } catch (e) {
      console.error('[DiffViewer] Failed to create:', e)
      wrapper.textContent = `Error: ${e}`
    }
  })

  return root
}

const meta: Meta<DiffViewerStoryArgs> = {
  title: 'DiffViewer',
  render: renderDiffViewer as StoryFn<DiffViewerStoryArgs>,
  argTypes: {
    mode: {
      control: 'radio',
      options: ['side-by-side', 'inline'],
      description: 'Display mode: two editors side-by-side or a single unified editor',
    },
    format: {
      control: 'radio',
      options: ['yaml', 'json'],
      description: 'Output format for the API spec content',
    },
    dark: {
      control: 'boolean',
      description: 'Enable dark theme',
    },
    enableFolding: {
      control: 'boolean',
      description: 'Enable code folding for API structure blocks',
    },
    showClassification: {
      control: 'boolean',
      description: 'Show classification indicators (gutter bars, fold counters, badges)',
    },
    wordWrap: {
      control: 'boolean',
      description: 'Enable word wrapping. When false, horizontal scroll is synced in side-by-side mode',
    },
    wordDiffMode: {
      control: 'radio',
      options: ['word', 'char', 'none'],
      description: 'Word-level diff highlighting granularity',
    },
    filters: {
      control: 'check',
      options: ['breaking', 'non-breaking', 'annotation', 'unclassified'],
      description: 'Filter visible changes by classification type',
    },
  },
  args: {
    mode: 'side-by-side',
    format: 'yaml',
    dark: false,
    enableFolding: false,
    showClassification: false,
    wordWrap: true,
    wordDiffMode: 'word',
    filters: [],
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

// ── OpenAPI Stories ──

export const OpenAPISideBySide = {
  name: 'OpenAPI — Side-by-Side',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side' as const,
    format: 'yaml' as const,
  },
}

export const OpenAPIInline = {
  name: 'OpenAPI — Inline',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'inline' as const,
    format: 'yaml' as const,
  },
}

export const OpenAPIJson = {
  name: 'OpenAPI — JSON Format',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    format: 'json' as const,
  },
}

export const OpenAPIDarkMode = {
  name: 'OpenAPI — Dark Mode',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    dark: true,
  },
}

export const OpenAPIDarkInline = {
  name: 'OpenAPI — Dark Mode Inline',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    dark: true,
    mode: 'inline' as const,
  },
}

export const OpenAPIWithFolding = {
  name: 'OpenAPI — Folding + Classification',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    enableFolding: true,
    showClassification: true,
  },
}

export const OpenAPICharDiff = {
  name: 'OpenAPI — Char-Level Diff',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    wordDiffMode: 'char' as const,
  },
}

export const OpenAPINoWordDiff = {
  name: 'OpenAPI — No Word Diff',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    wordDiffMode: 'none' as const,
  },
}

// ── JsonSchema Stories ──

export const JsonSchemaSideBySide = {
  name: 'JsonSchema — Side-by-Side',
  args: {
    before: jsonSchemaBefore,
    after: jsonSchemaAfter,
  },
}

export const JsonSchemaInline = {
  name: 'JsonSchema — Inline',
  args: {
    before: jsonSchemaBefore,
    after: jsonSchemaAfter,
    mode: 'inline' as const,
  },
}

export const JsonSchemaDarkMode = {
  name: 'JsonSchema — Dark Mode',
  args: {
    before: jsonSchemaBefore,
    after: jsonSchemaAfter,
    dark: true,
  },
}

// ── AsyncAPI Stories ──

export const AsyncAPISideBySide = {
  name: 'AsyncAPI — Side-by-Side',
  args: {
    before: asyncApiBefore,
    after: asyncApiAfter,
  },
}

export const AsyncAPIInline = {
  name: 'AsyncAPI — Inline',
  args: {
    before: asyncApiBefore,
    after: asyncApiAfter,
    mode: 'inline' as const,
  },
}

export const AsyncAPIDarkWithFolding = {
  name: 'AsyncAPI — Dark + Folding',
  args: {
    before: asyncApiBefore,
    after: asyncApiAfter,
    dark: true,
    enableFolding: true,
    showClassification: true,
  },
}

// ── Filter Stories ──

export const OpenAPIFilterBreaking = {
  name: 'OpenAPI — Filter: Breaking Only',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    enableFolding: true,
    showClassification: true,
    filters: ['breaking'] as const,
  },
}

export const OpenAPIFilterMultiple = {
  name: 'OpenAPI — Filter: Breaking + Annotation',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    enableFolding: true,
    showClassification: true,
    filters: ['breaking', 'annotation'] as const,
  },
}

// ── All Options Showcase ──

export const AllOptions = {
  name: 'All Options Enabled',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side' as const,
    format: 'yaml' as const,
    dark: false,
    enableFolding: true,
    showClassification: true,
    wordDiffMode: 'word' as const,
  },
}

export const AllOptionsDark = {
  name: 'All Options Enabled (Dark)',
  args: {
    before: openApiBefore,
    after: openApiAfter,
    mode: 'side-by-side' as const,
    format: 'yaml' as const,
    dark: true,
    enableFolding: true,
    showClassification: true,
    wordDiffMode: 'word' as const,
  },
}
