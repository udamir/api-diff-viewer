/**
 * Factory functions for creating CodeMirror diff views
 */

import { Extension } from '@codemirror/state'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, drawSelection, highlightActiveLine, keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'

import type { DiffData, DiffConfig, DiffPairResult, CoordinatorOptions } from './types'
import { defaultDiffConfig } from './types'
import { diffStateField, setDiffDataEffect, setSideEffect } from './state/diff-state'
import { diffDecorations, diffDecorationsTheme } from './extensions/diff-decorations'
import { diffGutter } from './extensions/diff-gutter'
import { diffTheme } from './themes/diff-theme'
import { createCoordinator } from './coordinator'

/**
 * Creates a combined diff extension for a single CodeMirror editor.
 * This is the main entry point for adding diff visualization to an existing editor.
 *
 * @param data - The diff data containing blocks, line mappings, and block mappings
 * @param config - Optional configuration overrides
 * @returns An Extension array to add to a CodeMirror editor
 *
 * @example
 * ```typescript
 * import { EditorView } from '@codemirror/view'
 * import { diff } from './codemirror'
 *
 * const view = new EditorView({
 *   doc: content,
 *   extensions: [
 *     basicSetup,
 *     diff(diffData, { side: 'after', showGutter: true }),
 *   ],
 *   parent: container,
 * })
 * ```
 */
export function diff(data: DiffData, config?: Partial<DiffConfig>): Extension {
  const mergedConfig = { ...defaultDiffConfig, ...config }
  const extensions: Extension[] = [
    diffStateField,
    diffDecorationsTheme,
  ]

  // Add diff decorations
  extensions.push(diffDecorations(data, { side: mergedConfig.side }))

  // Add gutter if enabled
  if (mergedConfig.showGutter) {
    extensions.push(diffGutter(data))
  }

  // Add theme
  extensions.push(diffTheme({ dark: false }))

  return extensions
}

/**
 * Creates base editor extensions shared by all diff views
 */
function createBaseExtensions(format: 'json' | 'yaml', readOnly: boolean = true): Extension[] {
  const languageExt = format === 'json' ? json() : yaml()

  return [
    lineNumbers(),
    drawSelection(),
    highlightActiveLine(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    languageExt,
    EditorView.editable.of(!readOnly),
    EditorView.lineWrapping,
  ]
}

/**
 * Creates a paired side-by-side diff view with two synchronized editors.
 *
 * @param beforeParent - DOM element to mount the "before" editor
 * @param afterParent - DOM element to mount the "after" editor
 * @param beforeContent - Content for the "before" editor
 * @param afterContent - Content for the "after" editor
 * @param diffData - The diff data
 * @param config - Optional configuration
 * @returns DiffPairResult containing both editors and a coordinator
 *
 * @example
 * ```typescript
 * const { before, after, coordinator, destroy } = createDiffPair(
 *   document.getElementById('before'),
 *   document.getElementById('after'),
 *   beforeYaml,
 *   afterYaml,
 *   diffData,
 *   { showGutter: true, syncScroll: true }
 * )
 *
 * // Navigate
 * coordinator.goToNextChange()
 *
 * // Cleanup
 * destroy()
 * ```
 */
export function createDiffPair(
  beforeParent: HTMLElement,
  afterParent: HTMLElement,
  beforeContent: string,
  afterContent: string,
  diffData: DiffData,
  config?: Partial<DiffConfig>,
  coordinatorOptions?: CoordinatorOptions
): DiffPairResult {
  const mergedConfig = { ...defaultDiffConfig, ...config }
  const format = mergedConfig.format

  // Create before editor
  const beforeExtensions: Extension[] = [
    ...createBaseExtensions(format),
    diffStateField,
    diffDecorationsTheme,
    diffDecorations(diffData, { side: 'before' }),
    diffTheme({ dark: false }),
  ]

  if (mergedConfig.showGutter) {
    beforeExtensions.push(diffGutter(diffData))
  }

  const beforeState = EditorState.create({
    doc: beforeContent,
    extensions: beforeExtensions,
  })

  const beforeView = new EditorView({
    state: beforeState,
    parent: beforeParent,
  })

  // Set side and diff data for before
  beforeView.dispatch({
    effects: [
      setSideEffect.of('before'),
      setDiffDataEffect.of(diffData),
    ],
  })

  // Create after editor
  const afterExtensions: Extension[] = [
    ...createBaseExtensions(format),
    diffStateField,
    diffDecorationsTheme,
    diffDecorations(diffData, { side: 'after' }),
    diffTheme({ dark: false }),
  ]

  if (mergedConfig.showGutter) {
    afterExtensions.push(diffGutter(diffData))
  }

  const afterState = EditorState.create({
    doc: afterContent,
    extensions: afterExtensions,
  })

  const afterView = new EditorView({
    state: afterState,
    parent: afterParent,
  })

  // Set side and diff data for after
  afterView.dispatch({
    effects: [
      setSideEffect.of('after'),
      setDiffDataEffect.of(diffData),
    ],
  })

  // Set up scroll synchronization if enabled
  let scrollSyncCleanup: (() => void) | undefined
  if (mergedConfig.syncScroll) {
    scrollSyncCleanup = setupScrollSync(beforeView, afterView, coordinatorOptions?.scrollStrategy)
  }

  // Create coordinator
  const coordinator = createCoordinator(beforeView, afterView, diffData)

  // Create destroy function
  const destroy = () => {
    scrollSyncCleanup?.()
    coordinator.destroy()
  }

  return {
    before: beforeView,
    after: afterView,
    coordinator,
    destroy,
  }
}

/**
 * Creates a unified inline diff view with a single editor.
 *
 * @param parent - DOM element to mount the editor
 * @param unifiedContent - The unified content (typically the "after" content with annotations)
 * @param diffData - The diff data
 * @param config - Optional configuration
 * @returns The EditorView instance
 *
 * @example
 * ```typescript
 * const view = createUnifiedDiff(
 *   document.getElementById('diff'),
 *   unifiedContent,
 *   diffData,
 *   { showGutter: true }
 * )
 * ```
 */
export function createUnifiedDiff(
  parent: HTMLElement,
  unifiedContent: string,
  diffData: DiffData,
  config?: Partial<DiffConfig>
): EditorView {
  const mergedConfig = { ...defaultDiffConfig, ...config }
  const format = mergedConfig.format

  const extensions: Extension[] = [
    ...createBaseExtensions(format),
    diffStateField,
    diffDecorationsTheme,
    diffDecorations(diffData, { side: 'unified' }),
    diffTheme({ dark: false }),
  ]

  if (mergedConfig.showGutter) {
    extensions.push(diffGutter(diffData))
  }

  const state = EditorState.create({
    doc: unifiedContent,
    extensions,
  })

  const view = new EditorView({
    state,
    parent,
  })

  // Set unified side and diff data
  view.dispatch({
    effects: [
      setSideEffect.of('unified'),
      setDiffDataEffect.of(diffData),
    ],
  })

  return view
}

/**
 * Sets up scroll synchronization between two editors.
 */
function setupScrollSync(
  beforeView: EditorView,
  afterView: EditorView,
  strategy: 'ratio' | 'line' | 'block' = 'ratio'
): () => void {
  let syncEnabled = true

  const syncScroll = (source: EditorView, target: EditorView) => {
    if (!syncEnabled) return

    const sourceScroll = source.scrollDOM
    const targetScroll = target.scrollDOM

    if (strategy === 'ratio') {
      // Ratio-based sync
      const sourceScrollHeight = sourceScroll.scrollHeight - sourceScroll.clientHeight
      const targetScrollHeight = targetScroll.scrollHeight - targetScroll.clientHeight

      if (sourceScrollHeight <= 0) return

      const ratio = sourceScroll.scrollTop / sourceScrollHeight
      const targetScrollTop = ratio * targetScrollHeight

      syncEnabled = false
      targetScroll.scrollTop = targetScrollTop

      requestAnimationFrame(() => {
        syncEnabled = true
      })
    } else {
      // For line/block strategy, we sync pixel position (simplified)
      syncEnabled = false
      targetScroll.scrollTop = sourceScroll.scrollTop

      requestAnimationFrame(() => {
        syncEnabled = true
      })
    }
  }

  const beforeScrollHandler = () => syncScroll(beforeView, afterView)
  const afterScrollHandler = () => syncScroll(afterView, beforeView)

  beforeView.scrollDOM.addEventListener('scroll', beforeScrollHandler)
  afterView.scrollDOM.addEventListener('scroll', afterScrollHandler)

  return () => {
    beforeView.scrollDOM.removeEventListener('scroll', beforeScrollHandler)
    afterView.scrollDOM.removeEventListener('scroll', afterScrollHandler)
  }
}
