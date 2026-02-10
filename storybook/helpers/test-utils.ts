import { expect, waitFor } from 'storybook/test'
import type { DiffViewer, DiffViewerOptions, ChangeSummary } from '../../src/index'
import { createDiffViewer } from '../../src/index'
import '../../src/styles.css'

import openApiBefore from '../samples/openApi.before'
import openApiAfter from '../samples/openApi.after'

export { openApiBefore, openApiAfter }

/**
 * Shared render function for test stories.
 * Creates a container, attaches a DiffViewer in requestAnimationFrame,
 * and stores the viewer instance on the container element.
 */
export function renderDiffViewer(args: { before: object; after: object } & DiffViewerOptions): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.height = '600px'
  wrapper.style.border = '1px solid #d0d7de'
  wrapper.style.borderRadius = '6px'
  wrapper.style.overflow = 'hidden'
  wrapper.style.position = 'relative'

  const { before, after, ...options } = args

  requestAnimationFrame(() => {
    const prev = (wrapper as any).__viewer as DiffViewer | undefined
    if (prev) {
      try { prev.destroy() } catch { /* noop */ }
    }

    try {
      const viewer = createDiffViewer(wrapper, before, after, {
        ...options,
        useWorker: false,
      })

      ;(wrapper as any).__viewer = viewer
    } catch (e) {
      console.error('[DiffViewer] Failed to create:', e)
      wrapper.textContent = `Error: ${e}`
    }
  })

  return wrapper
}

/**
 * Wait for DiffViewer to finish rendering inside a canvas element.
 * Returns the container wrapper and the DiffViewer instance.
 */
export async function waitForViewer(canvasElement: HTMLElement): Promise<{
  container: HTMLElement
  viewer: DiffViewer
}> {
  let container!: HTMLElement
  let viewer!: DiffViewer

  await waitFor(() => {
    container = canvasElement.querySelector('div') as HTMLElement
    expect(container).not.toBeNull()

    const editors = container.querySelectorAll('.cm-editor')
    expect(editors.length).toBeGreaterThan(0)

    viewer = (container as any).__viewer as DiffViewer
    expect(viewer).toBeDefined()
  }, { timeout: 5000 })

  return { container, viewer }
}

/**
 * Wait for the viewer's 'ready' event.
 * Note: In sync mode (useWorker: false), the ready event fires via queueMicrotask
 * immediately after construction. If you call this after waitForViewer, the event
 * has already fired. Use getChangeSummary() instead for post-construction checks.
 */
export function onReady(viewer: DiffViewer): Promise<ChangeSummary> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('ready timeout')), 5000)
    viewer.on('ready', ({ summary }) => {
      clearTimeout(timeout)
      resolve(summary)
    })
  })
}

/**
 * Count elements matching a CSS selector.
 */
export function countElements(container: HTMLElement, selector: string): number {
  return container.querySelectorAll(selector).length
}
