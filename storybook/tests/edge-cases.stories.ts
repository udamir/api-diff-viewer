import type { Meta, StoryObj } from '@storybook/html-vite'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import { createDiffViewer } from '../../src/index'
import type { DiffViewerOptions } from '../../src/index'
import {
  emptySpec,
  identicalSpec,
  jsonStringBefore,
  jsonStringAfter,
  deeplyNestedBefore,
  deeplyNestedAfter,
  minimalBefore,
  minimalAfter,
} from '../helpers/samples/edge-cases'
import jsonSchemaBefore from '../samples/jsonSchema.before'
import jsonSchemaAfter from '../samples/jsonSchema.after'

interface Args extends DiffViewerOptions {
  before: object | string
  after: object | string
}

const meta: Meta<Args> = {
  title: 'Tests/Edge Cases',
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

export const EmptySpecs: Story = {
  name: 'Empty specs render without error',
  args: { before: emptySpec, after: emptySpec },
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const summary = viewer.getChangeSummary()
    expect(summary.total).toBe(0)
  },
}

export const IdenticalSpecs: Story = {
  name: 'Identical specs produce zero changes',
  args: { before: identicalSpec, after: identicalSpec },
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)
    const summary = viewer.getChangeSummary()
    expect(summary.total).toBe(0)

    // No diff decorations should exist
    const diffLines = container.querySelectorAll(
      '.cm-diff-line-added, .cm-diff-line-removed, .cm-diff-line-modified'
    )
    expect(diffLines.length).toBe(0)
  },
}

export const MinimalChange: Story = {
  name: 'Minimal spec with single change',
  args: { before: minimalBefore, after: minimalAfter },
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const summary = viewer.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)
  },
}

export const DeeplyNestedSpec: Story = {
  name: 'Deeply nested spec renders without hanging',
  args: { before: deeplyNestedBefore, after: deeplyNestedAfter },
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    const summary = viewer.getChangeSummary()
    expect(summary).toBeDefined()
    expect(typeof summary.total).toBe('number')
  },
}

export const UpdateWithNewSpecs: Story = {
  name: 'update() changes content',
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    const initialSummary = viewer.getChangeSummary()
    expect(initialSummary.total).toBeGreaterThan(0)

    // Update with different specs
    viewer.update(jsonSchemaBefore, jsonSchemaAfter)

    await waitFor(() => {
      const newSummary = viewer.getChangeSummary()
      // JsonSchema has different change count than OpenAPI
      expect(newSummary).toBeDefined()
      expect(newSummary.total).toBeGreaterThan(0)
    })
  },
}

export const UpdateWithEmptySpecs: Story = {
  name: 'update() with empty specs produces zero changes',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    viewer.update(emptySpec, emptySpec)

    await waitFor(() => {
      const summary = viewer.getChangeSummary()
      expect(summary.total).toBe(0)
    })
  },
}

export const UpdateWithIdenticalSpecs: Story = {
  name: 'update() with identical specs produces zero changes',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    viewer.update(identicalSpec, identicalSpec)

    await waitFor(() => {
      const summary = viewer.getChangeSummary()
      expect(summary.total).toBe(0)
    })
  },
}
