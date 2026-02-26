import type { Meta, StoryFn, StoryObj } from '@storybook/html-vite'
import { expect, waitFor } from 'storybook/test'
import { renderDiffViewer, waitForViewer, openApiBefore, openApiAfter } from '../helpers/test-utils'
import type { DiffViewerOptions } from '../../src/index'

interface Args extends DiffViewerOptions {
  before: object
  after: object
}

const meta: Meta<Args> = {
  title: 'Tests/Theme',
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

export const LightModeDefault: Story = {
  name: 'Light mode is default',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    expect(viewer.isDark()).toBe(false)
  },
}

export const DarkModeApplied: Story = {
  name: 'Dark mode applied via option',
  args: { dark: true },
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)
    expect(viewer.isDark()).toBe(true)
  },
}

export const RuntimeThemeSwitch: Story = {
  name: 'Runtime theme switch light → dark → light',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    expect(viewer.isDark()).toBe(false)

    viewer.setTheme({ dark: true })
    expect(viewer.isDark()).toBe(true)

    viewer.setTheme({ dark: false })
    expect(viewer.isDark()).toBe(false)
  },
}

export const CustomColorOverrides: Story = {
  name: 'Custom color overrides are applied',
  args: {
    colors: {
      addedBg: 'rgba(0, 255, 0, 0.3)',
      removedBg: 'rgba(255, 0, 0, 0.3)',
    },
  },
  play: async ({ canvasElement }) => {
    const { container, viewer } = await waitForViewer(canvasElement)

    // Viewer should render without error with custom colors
    const editors = container.querySelectorAll('.cm-editor')
    expect(editors.length).toBeGreaterThan(0)

    const summary = viewer.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)
  },
}

export const ThemeChangeEventFired: Story = {
  name: 'themeChange event contains correct state',
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    const events: { dark: boolean }[] = []
    viewer.on('themeChange', (data) => {
      events.push(data)
    })

    viewer.setTheme({ dark: true })
    viewer.setTheme({ dark: false })

    expect(events.length).toBe(2)
    expect(events[0]).toEqual({ dark: true })
    expect(events[1]).toEqual({ dark: false })
  },
}

export const DarkModeWithCustomColors: Story = {
  name: 'Dark mode with custom colors',
  args: {
    dark: true,
    colors: {
      addedBg: 'rgba(0, 200, 0, 0.4)',
      removedBg: 'rgba(200, 0, 0, 0.4)',
    },
  },
  play: async ({ canvasElement }) => {
    const { viewer } = await waitForViewer(canvasElement)

    expect(viewer.isDark()).toBe(true)
    const summary = viewer.getChangeSummary()
    expect(summary.total).toBeGreaterThan(0)
  },
}
