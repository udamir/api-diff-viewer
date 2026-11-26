import type { Meta, StoryFn, StoryObj } from '@storybook/html-vite'
import type { CompareError } from 'api-smart-diff'
import { expect, waitFor } from 'storybook/test'
import { createDiffViewer } from '../../src/index'
import type { ChangeSummary, DiffViewer, DiffViewerError, DiffViewerOptions } from '../../src/index'
import { viewerStore, waitForViewer } from '../helpers/test-utils'
import {
  asyncApi30After,
  asyncApi30Before,
  graphApi10After,
  graphApi10Before,
  openApi31After,
  openApi31Before,
  protoApiAfter,
  protoApiBefore,
  swagger2After,
  swagger2Before,
} from '../samples/asd2'
import '../../src/styles.css'

/**
 * api-smart-diff 2.x: six classifications (risky, deprecated), renames, the new formats
 * and errors reported as events instead of exceptions.
 */

interface Args extends DiffViewerOptions {
  before: object | string
  after: object | string
}

interface Captured {
  ready?: { summary: ChangeSummary; errors: CompareError[] }
  error?: DiffViewerError
  thrown?: unknown
}

/** Events captured per container (listeners are attached right after construction) */
const captured = new WeakMap<HTMLElement, Captured>()

function render(args: Args): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'height:600px;border:1px solid #d0d7de;border-radius:6px;overflow:hidden;position:relative'
  const { before, after, ...options } = args
  const events: Captured = {}
  captured.set(wrapper, events)

  requestAnimationFrame(() => {
    try {
      const viewer = createDiffViewer(wrapper, before, after, { useWorker: false, ...options })
      viewer.on('ready', (payload) => {
        events.ready = payload
      })
      viewer.on('error', (payload) => {
        events.error = payload
        const notice = document.createElement('div')
        notice.className = 'story-error'
        notice.setAttribute('role', 'alert')
        notice.textContent = `${payload.kind}: ${payload.message}`
        wrapper.appendChild(notice)
      })
      viewerStore.set(wrapper, viewer)
    } catch (e) {
      events.thrown = e
    }
  })
  return wrapper
}

async function waitForEvent(canvasElement: HTMLElement, key: 'ready' | 'error'): Promise<Captured> {
  let events!: Captured
  await waitFor(
    () => {
      const container = canvasElement.querySelector('div') as HTMLElement
      events = captured.get(container) as Captured
      expect(events?.thrown).toBeUndefined()
      expect(events?.[key]).toBeDefined()
    },
    { timeout: 5000 }
  )
  return events
}

const editorText = (viewer: DiffViewer, side: 'before' | 'after') =>
  viewer.getEditorViews()[side]?.state.doc.toString() ?? ''

const meta: Meta<Args> = {
  title: 'Tests/api-smart-diff 2',
  render: render as StoryFn<Args>,
  args: {
    before: openApi31Before,
    after: openApi31After,
    mode: 'side-by-side',
    format: 'yaml',
    showClassification: true,
    enableFolding: true,
  },
}

export default meta
type Story = StoryObj<Args>

export const AllSixClassifications: Story = {
  name: 'OpenAPI 3.1: all six classifications are counted and coloured',
  play: async ({ canvasElement }) => {
    const { ready } = await waitForEvent(canvasElement, 'ready')
    const summary = ready!.summary
    for (const key of ['breaking', 'risky', 'nonBreaking', 'deprecated', 'annotation', 'unclassified'] as const) {
      expect(summary[key], key).toBeGreaterThan(0)
    }
    expect(summary.total).toBe(
      summary.breaking + summary.risky + summary.nonBreaking + summary.deprecated + summary.annotation + summary.unclassified
    )
    expect(ready!.errors).toEqual([])

    const { container, viewer } = await waitForViewer(canvasElement)
    // Classification bars, light theme: [type, css colour, aria label]
    const expected: [string, string, string][] = [
      ['breaking', 'rgb(207, 34, 46)', 'Breaking change'],
      ['risky', 'rgb(188, 76, 0)', 'Risky change'],
      ['non-breaking', 'rgb(26, 127, 55)', 'Non-breaking change'],
      ['deprecated', 'rgb(154, 103, 0)', 'Deprecated change'],
      ['annotation', 'rgb(130, 80, 223)', 'Annotation change'],
      ['unclassified', 'rgb(101, 109, 118)', 'Unclassified change'],
    ]
    for (const [type, color, label] of expected) {
      // bring a change of this type into the viewport (CodeMirror renders only visible lines)
      viewer.navigation.goToNextChange(type as never)
      await waitFor(() => {
        const dot = container.querySelector(`.cm-diff-type-dot.cm-diff-type-${type}`) as HTMLElement
        expect(dot, type).not.toBeNull()
        expect(getComputedStyle(dot).backgroundColor).toBe(color)
        expect(dot.getAttribute('aria-label')).toBe(label)
      })
    }
    // fold placeholders of collapsed blocks count risky and deprecated changes
    viewer.collapseAll()
    await waitFor(() => {
      const risky = container.querySelector('.cm-diff-fold-badge-risky') as HTMLElement
      expect(risky).not.toBeNull()
      expect(risky.title).toMatch(/^\d+ risky$/)
      expect(container.querySelector('.cm-diff-fold-badge-deprecated')).not.toBeNull()
    })
  },
}

export const RiskyFilter: Story = {
  name: 'Filter: risky only',
  args: { filters: ['risky'] },
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    expect(viewer.getFilters()).toEqual(['risky'])
    expect(viewer.navigation.goToNextChange('risky')).toContain('enum')
  },
}

export const RenamedPath: Story = {
  name: 'Rename: the before and after keys are shown on their sides',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    await waitFor(() => {
      expect(editorText(viewer, 'before')).toContain('/pets/{id}:')
      expect(editorText(viewer, 'after')).toContain('/pets/{petId}:')
      expect(editorText(viewer, 'after')).not.toContain('/pets/{id}:')
    })
  },
}

export const AsyncApi30: Story = {
  name: 'AsyncAPI 3.0 renders',
  args: { before: asyncApi30Before, after: asyncApi30After },
  play: async ({ canvasElement }) => {
    const { ready } = await waitForEvent(canvasElement, 'ready')
    expect(ready!.summary.breaking).toBeGreaterThan(0)
    expect(ready!.summary.risky).toBeGreaterThan(0)
  },
}

export const GraphApi10: Story = {
  name: 'GraphApi 1.0 renders',
  args: { before: graphApi10Before, after: graphApi10After },
  play: async ({ canvasElement }) => {
    const { ready } = await waitForEvent(canvasElement, 'ready')
    expect(ready!.summary.risky).toBeGreaterThan(0)
    expect(ready!.summary.deprecated).toBeGreaterThan(0)
  },
}

export const ProtoApi: Story = {
  name: 'ProtoApi renders',
  args: { before: protoApiBefore, after: protoApiAfter },
  play: async ({ canvasElement }) => {
    const { ready } = await waitForEvent(canvasElement, 'ready')
    expect(ready!.summary.breaking).toBeGreaterThan(0)
    expect(ready!.summary.risky).toBeGreaterThan(0)
  },
}

export const UnsupportedSpec: Story = {
  name: 'Error: Swagger 2.0 is reported as an unsupported-spec error event',
  args: { before: swagger2Before, after: swagger2After },
  play: async ({ canvasElement }) => {
    const { error } = await waitForEvent(canvasElement, 'error')
    expect(error!.kind).toBe('unsupported-spec')
    expect(error!.name).toBe('UnsupportedSpecError')
    expect(error!.message).toContain('Swagger 2.0')
    expect(canvasElement.querySelector('[role="alert"]')?.textContent).toContain('unsupported-spec')
  },
}

export const MixedSpecs: Story = {
  name: 'Error: two different specifications',
  args: { before: openApi31Before, after: asyncApi30After },
  play: async ({ canvasElement }) => {
    const { error } = await waitForEvent(canvasElement, 'error')
    expect(error!.kind).toBe('unsupported-spec')
  },
}

export const InvalidJsonString: Story = {
  name: 'Error: a YAML string input is reported as invalid-input',
  args: { before: 'openapi: 3.1.0\ninfo: {}', after: '{"openapi":"3.1.0"}' },
  play: async ({ canvasElement }) => {
    const { error } = await waitForEvent(canvasElement, 'error')
    expect(error!.kind).toBe('invalid-input')
  },
}

export const CompareErrors: Story = {
  name: 'Comparison errors (unresolved $ref) are passed with ready',
  args: {
    before: {
      openapi: '3.1.0',
      info: { title: 'A', version: '1' },
      paths: { '/a': { get: { responses: { '200': { $ref: '#/components/responses/Missing' } } } } },
    },
    after: {
      openapi: '3.1.0',
      info: { title: 'A', version: '2' },
      paths: { '/a': { get: { responses: { '200': { $ref: '#/components/responses/Other' } } } } },
    },
  },
  play: async ({ canvasElement }) => {
    const { ready } = await waitForEvent(canvasElement, 'ready')
    expect(ready!.errors.length).toBeGreaterThan(0)
    expect(ready!.errors[0].kind).toBe('ref')
    const { viewer } = await waitForViewer(canvasElement)
    expect(viewer.getCompareErrors()).toEqual(ready!.errors)
  },
}

export const UpdateToUnsupported: Story = {
  name: 'update() to an unsupported document emits error and keeps the viewer alive',
  play: async ({ canvasElement }) => {
    await waitForEvent(canvasElement, 'ready')
    const { container, viewer } = await waitForViewer(canvasElement)
    viewer.update(swagger2Before, swagger2After)
    const events = captured.get(container)!
    expect(events.error?.kind).toBe('unsupported-spec')
    // a later valid update renders again
    viewer.update(graphApi10Before, graphApi10After)
    expect(viewer.getChangeSummary().risky).toBeGreaterThan(0)
  },
}

/** The worker entry served by Vite as a module worker */
const workerUrl = new URL('../../src/worker/diff-worker.ts', import.meta.url).href

export const WorkerCompare: Story = {
  name: 'Worker: merged document and classifications cross postMessage',
  args: { useWorker: true, workerUrl },
  play: async ({ canvasElement }) => {
    const { ready } = await waitForEvent(canvasElement, 'ready')
    expect(ready!.summary.risky).toBeGreaterThan(0)
    expect(ready!.summary.deprecated).toBeGreaterThan(0)
    expect(ready!.errors).toEqual([])
    // the comparison really ran in the worker (no synchronous fallback)
    const { viewer } = await waitForViewer(canvasElement)
    const manager = (viewer as unknown as { workerManager: { worker: Worker | null; _useFallback: boolean } }).workerManager
    expect(manager.worker).not.toBeNull()
    expect(manager._useFallback).toBe(false)
  },
}

export const WorkerUnsupportedSpec: Story = {
  name: 'Worker: UnsupportedSpecError keeps its name across the worker',
  args: { useWorker: true, workerUrl, before: swagger2Before, after: swagger2After },
  play: async ({ canvasElement }) => {
    const { error } = await waitForEvent(canvasElement, 'error')
    expect(error!.kind).toBe('unsupported-spec')
    expect(error!.name).toBe('UnsupportedSpecError')
  },
}
