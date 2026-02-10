/**
 * Height Synchronization for Side-by-Side Diff View
 *
 * Measures visual line heights in both editors and inserts
 * invisible padding widgets on the shorter side to equalize
 * cumulative heights. This ensures scroll sync (scrollTop copy)
 * works correctly even when lines wrap differently on each side.
 *
 * Uses a persistent padding map so that paddings for off-screen
 * lines are preserved across measurement cycles. On container
 * resize (which changes word-wrap for all lines), performs a
 * full reset with debouncing.
 *
 * Key stability mechanism: when dispatching padding effects, a
 * `dispatching` flag suppresses the update listeners so that our
 * own geometry changes don't re-trigger measurement. Additionally,
 * known padding contributions are subtracted from lineBlockAt
 * results to get stable intrinsic line heights.
 *
 * Recalculates on:
 * - Geometry changes (fold/unfold, content changes) — external only
 * - Viewport changes (scroll into new regions)
 * - Container resize (word wrap changes) — full reset
 */

import { StateEffect, StateField } from '@codemirror/state'
import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
} from '@codemirror/view'
import { foldEffect, unfoldEffect } from '@codemirror/language'

// ── Constants ──

/** Height difference threshold in pixels; differences below this are ignored */
const HEIGHT_THRESHOLD = 0.5

/** Number of lines to measure beyond the visible viewport on each side */
const VIEWPORT_BUFFER = 30

/** Debounce delay (ms) for container resize before triggering full reset */
const RESIZE_DEBOUNCE_MS = 150

// ── Padding entry ──

/** Padding entry: document position and pixel height to add */
export interface HeightPadding {
  pos: number
  height: number
}

// ── Widget ──

/** Block widget that renders as invisible space with a given height */
class HeightPadWidget extends WidgetType {
  constructor(readonly padHeight: number) {
    super()
  }

  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.style.height = `${this.padHeight}px`
    div.className = 'cm-height-pad'
    return div
  }

  eq(other: HeightPadWidget): boolean {
    return Math.abs(this.padHeight - other.padHeight) < HEIGHT_THRESHOLD
  }

  get estimatedHeight(): number {
    return this.padHeight
  }
}

// ── State & Decorations ──

/** Effect to replace all height paddings */
const setHeightPaddingEffect = StateEffect.define<HeightPadding[]>()

/** Build block widget DecorationSet from a paddings array */
function buildPadDecorations(
  paddings: HeightPadding[],
  docLen: number
): DecorationSet {
  if (paddings.length === 0) return Decoration.none

  const widgets = []

  for (const pad of paddings) {
    if (pad.pos < 0 || pad.pos > docLen || pad.height < HEIGHT_THRESHOLD) continue
    widgets.push(
      Decoration.widget({
        widget: new HeightPadWidget(pad.height),
        block: true,
        side: 1,
      }).range(pad.pos)
    )
  }

  if (widgets.length === 0) return Decoration.none
  return Decoration.set(widgets, true)
}

/**
 * State field that stores height paddings AND provides block decorations.
 *
 * Block-level decorations (block: true widgets) MUST be provided via a
 * StateField, not a ViewPlugin. CodeMirror throws "Block decorations may
 * not be specified via plugins" if you try the latter.
 */
const heightPaddingField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHeightPaddingEffect)) {
        return buildPadDecorations(effect.value, tr.newDoc.length)
      }
    }
    if (tr.docChanged) {
      return decos.map(tr.changes)
    }
    return decos
  },
  provide: (field) => EditorView.decorations.from(field),
})

/** Theme for height padding widgets (invisible) */
const heightPadTheme = EditorView.baseTheme({
  '.cm-height-pad': {
    overflow: 'hidden',
    pointerEvents: 'none',
  },
})

/** Compare two padding arrays for equality (within tolerance) */
export function paddingsEqual(a: HeightPadding[], b: HeightPadding[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].pos !== b[i].pos) return false
    if (Math.abs(a[i].height - b[i].height) > HEIGHT_THRESHOLD) return false
  }
  return true
}

/** Convert a padding map to a sorted HeightPadding array */
export function mapToPaddings(
  padMap: Map<number, number>,
  doc: { line: (n: number) => { to: number }; lines: number }
): HeightPadding[] {
  const entries = [...padMap.entries()]
    .filter(([lineNum]) => lineNum >= 1 && lineNum <= doc.lines)
    .sort((a, b) => a[0] - b[0])

  return entries.map(([lineNum, height]) => ({
    pos: doc.line(lineNum).to,
    height,
  }))
}

// ── Main entry point ──

/**
 * Sets up height synchronization between two side-by-side editors.
 *
 * For each visible line, compares the visual height in both editors.
 * If one side is taller (due to word wrapping), inserts an invisible
 * padding widget on the shorter side to equalize the height.
 *
 * Maintains a persistent padding map so that paddings computed for
 * lines that later scroll out of view are preserved. On container
 * resize, performs a full reset since word-wrap changes invalidate
 * all previously measured heights.
 *
 * @param beforeView - The before (left) editor
 * @param afterView - The after (right) editor
 * @returns Cleanup function to disconnect observers and stop syncing
 */
export function setupHeightSync(
  beforeView: EditorView,
  afterView: EditorView
): () => void {
  let destroyed = false
  let measuring = false
  let rafId: number | null = null
  let resizeTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Flag set during our own dispatches to suppress re-triggering.
   * When we dispatch padding effects, CodeMirror fires update listeners
   * with geometryChanged=true. Without this guard, that would schedule
   * another measurement, creating an infinite loop.
   */
  let dispatching = false

  /** Generation counter — incremented on full reset to invalidate stale callbacks */
  let generation = 0

  /** Persistent padding maps: lineNumber → padding height in pixels */
  let beforePadMap = new Map<number, number>()
  let afterPadMap = new Map<number, number>()

  /** Last dispatched padding arrays (for change detection) */
  let currentBeforePads: HeightPadding[] = []
  let currentAfterPads: HeightPadding[] = []

  // Install extensions on both editors.
  // heightPaddingField provides block decorations via StateField.provide()
  // (block decorations cannot come from ViewPlugins in CodeMirror 6).
  beforeView.dispatch({
    effects: StateEffect.appendConfig.of([
      heightPaddingField,
      heightPadTheme,
    ]),
  })
  afterView.dispatch({
    effects: StateEffect.appendConfig.of([
      heightPaddingField,
      heightPadTheme,
    ]),
  })

  /**
   * Measure line heights in both editors for the visible viewport
   * and update the persistent padding maps.
   *
   * Subtracts known padding contributions from lineBlockAt results
   * so that measurements reflect intrinsic line heights regardless
   * of whether padding widgets are currently applied.
   *
   * @returns true if any paddings changed (dispatch occurred)
   */
  function measureAndEqualize(): boolean {
    if (destroyed || measuring) return false
    measuring = true

    try {
      const beforeDoc = beforeView.state.doc
      const afterDoc = afterView.state.doc
      const numLines = Math.min(beforeDoc.lines, afterDoc.lines)
      if (numLines === 0) return false

      // Skip measurement if editors have zero dimensions (hidden container)
      if (beforeView.dom.clientHeight === 0 || afterView.dom.clientHeight === 0) {
        return false
      }

      // Determine measurement range: visible viewport + buffer
      const beforeVp = beforeView.viewport
      const afterVp = afterView.viewport

      const vpFromLine = Math.min(
        beforeDoc.lineAt(beforeVp.from).number,
        afterDoc.lineAt(afterVp.from).number
      )
      const vpToLine = Math.max(
        beforeDoc.lineAt(beforeVp.to).number,
        afterDoc.lineAt(afterVp.to).number
      )

      const fromLine = Math.max(1, vpFromLine - VIEWPORT_BUFFER)
      const toLine = Math.min(numLines, vpToLine + VIEWPORT_BUFFER)

      // Measure visible lines and update the persistent maps.
      // Subtract any existing padding we've added to get the intrinsic
      // line height. This prevents feedback loops where lineBlockAt
      // includes the widget height, causing us to think heights are equal,
      // remove the padding, and then re-add it next cycle.
      //
      // Fold handling: when a range is folded, lineBlockAt returns the
      // same visual block for every document line in the fold. We track
      // block identity to skip continuation lines and clear their stale
      // padding entries. The fold header line is measured without padding
      // subtraction since its padding widget is hidden inside the fold.
      let prevBBlockFrom = -1
      let prevABlockFrom = -1

      for (let lineNum = fromLine; lineNum <= toLine; lineNum++) {
        const bLine = beforeDoc.line(lineNum)
        const aLine = afterDoc.line(lineNum)

        const bBlock = beforeView.lineBlockAt(bLine.from)
        const aBlock = afterView.lineBlockAt(aLine.from)

        // Skip lines inside a previously measured fold block.
        // All document lines in a fold share one visual block —
        // only the first line needs measurement.
        if (bBlock.from === prevBBlockFrom && aBlock.from === prevABlockFrom) {
          beforePadMap.delete(lineNum)
          afterPadMap.delete(lineNum)
          continue
        }
        prevBBlockFrom = bBlock.from
        prevABlockFrom = aBlock.from

        let bHeight = bBlock.height
        let aHeight = aBlock.height

        // Detect fold blocks (a visual block spanning multiple document lines).
        // Padding widgets inside a fold are hidden, so stale map entries must
        // be cleared and heights measured without subtraction.
        // Normal lines have bBlock.to === bLine.to + 1 (the newline); fold
        // blocks extend well past that.
        const bIsFold = bBlock.from !== bLine.from || bBlock.to > bLine.to + 1
        const aIsFold = aBlock.from !== aLine.from || aBlock.to > aLine.to + 1

        if (bIsFold || aIsFold) {
          beforePadMap.delete(lineNum)
          afterPadMap.delete(lineNum)

          const diff = bHeight - aHeight
          if (diff > HEIGHT_THRESHOLD) {
            afterPadMap.set(lineNum, diff)
          } else if (diff < -HEIGHT_THRESHOLD) {
            beforePadMap.set(lineNum, -diff)
          }
          continue
        }

        // Normal (non-folded) lines: subtract our own padding to get intrinsic height
        bHeight -= (beforePadMap.get(lineNum) || 0)
        aHeight -= (afterPadMap.get(lineNum) || 0)

        const diff = bHeight - aHeight

        if (diff > HEIGHT_THRESHOLD) {
          // Before is taller → pad after side
          afterPadMap.set(lineNum, diff)
          beforePadMap.delete(lineNum)
        } else if (diff < -HEIGHT_THRESHOLD) {
          // After is taller → pad before side
          beforePadMap.set(lineNum, -diff)
          afterPadMap.delete(lineNum)
        } else {
          // Heights are equal — remove any existing padding for this line
          beforePadMap.delete(lineNum)
          afterPadMap.delete(lineNum)
        }
      }

      // Convert maps to sorted arrays
      const beforePads = mapToPaddings(beforePadMap, beforeDoc)
      const afterPads = mapToPaddings(afterPadMap, afterDoc)

      // Only dispatch if paddings actually changed
      const bChanged = !paddingsEqual(currentBeforePads, beforePads)
      const aChanged = !paddingsEqual(currentAfterPads, afterPads)

      // Set dispatching flag to suppress update listener re-triggers
      dispatching = true
      try {
        if (bChanged) {
          currentBeforePads = beforePads
          beforeView.dispatch({
            effects: setHeightPaddingEffect.of(beforePads),
          })
        }
        if (aChanged) {
          currentAfterPads = afterPads
          afterView.dispatch({
            effects: setHeightPaddingEffect.of(afterPads),
          })
        }
      } finally {
        dispatching = false
      }

      return bChanged || aChanged
    } finally {
      measuring = false
    }
  }

  /**
   * Schedule equalization on the next animation frame (debounced).
   */
  function scheduleEqualize(): void {
    if (destroyed) return
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      measureAndEqualize()
    })
  }

  /**
   * Full reset: clears all paddings and re-measures from scratch.
   * Used after container resize since word-wrap changes invalidate
   * all previously measured heights.
   */
  function fullReset(): void {
    if (destroyed) return

    const gen = ++generation

    // Keep existing paddings visible during layout recalculation to
    // avoid a visible blink (clear → empty frames → re-apply). Instead,
    // wait for word-wrap to settle, then clear maps and re-measure in
    // the same frame so paddings transition atomically.
    requestAnimationFrame(() => {
      if (destroyed || gen !== generation) return
      requestAnimationFrame(() => {
        if (destroyed || gen !== generation) return
        requestAnimationFrame(() => {
          if (destroyed || gen !== generation) return

          // Clear persistent maps now that layout has settled
          beforePadMap = new Map()
          afterPadMap = new Map()
          currentBeforePads = []
          currentAfterPads = []

          // Clear decorations and immediately re-measure in the same frame
          dispatching = true
          beforeView.dispatch({
            effects: setHeightPaddingEffect.of([]),
          })
          afterView.dispatch({
            effects: setHeightPaddingEffect.of([]),
          })
          dispatching = false

          measureAndEqualize()
        })
      })
    })
  }

  /**
   * Fold reset: clears all paddings and re-measures from scratch.
   * Fold/unfold invalidates the persistent padding maps because padding
   * widgets inside a fold are hidden and no longer contribute to visual
   * height, making stale map entries incorrect.
   */
  function foldReset(): void {
    if (destroyed) return

    beforePadMap = new Map()
    afterPadMap = new Map()
    currentBeforePads = []
    currentAfterPads = []

    dispatching = true
    beforeView.dispatch({ effects: setHeightPaddingEffect.of([]) })
    afterView.dispatch({ effects: setHeightPaddingEffect.of([]) })
    dispatching = false

    scheduleEqualize()
  }

  /** Check whether an editor update contains fold/unfold effects */
  function hasFoldEffects(update: { transactions: readonly { effects: readonly StateEffect<unknown>[] }[] }): boolean {
    return update.transactions.some(tr =>
      tr.effects.some(e => e.is(foldEffect) || e.is(unfoldEffect))
    )
  }

  // Listen for geometry/viewport changes on both editors.
  // The `dispatching` flag prevents re-triggering when the geometry
  // change was caused by our own padding dispatch.
  // Fold/unfold events trigger a full padding reset because stale
  // entries for folded lines would corrupt measurements.
  const beforeListener = EditorView.updateListener.of((update) => {
    if (dispatching) return
    if (hasFoldEffects(update)) {
      foldReset()
    } else if (update.geometryChanged || update.viewportChanged) {
      scheduleEqualize()
    }
  })

  const afterListener = EditorView.updateListener.of((update) => {
    if (dispatching) return
    if (hasFoldEffects(update)) {
      foldReset()
    } else if (update.geometryChanged || update.viewportChanged) {
      scheduleEqualize()
    }
  })

  beforeView.dispatch({
    effects: StateEffect.appendConfig.of(beforeListener),
  })
  afterView.dispatch({
    effects: StateEffect.appendConfig.of(afterListener),
  })

  // ResizeObserver: full reset when containers resize (word wrap changes).
  // Debounced to avoid rapid-fire measurements during drag-resize.
  const resizeObserver = new ResizeObserver(() => {
    if (destroyed) return

    if (resizeTimer !== null) {
      clearTimeout(resizeTimer)
    }
    resizeTimer = setTimeout(() => {
      resizeTimer = null
      fullReset()
    }, RESIZE_DEBOUNCE_MS)
  })

  const beforeParent = beforeView.dom.parentElement
  const afterParent = afterView.dom.parentElement
  if (beforeParent) resizeObserver.observe(beforeParent)
  if (afterParent) resizeObserver.observe(afterParent)

  // Initial equalization: 3x RAF to wait for CodeMirror's first layout
  // (fonts loaded, CSS applied, word-wrap calculated)
  requestAnimationFrame(() => {
    if (destroyed) return
    requestAnimationFrame(() => {
      if (destroyed) return
      requestAnimationFrame(() => {
        if (destroyed) return
        measureAndEqualize()
      })
    })
  })

  // Cleanup
  return () => {
    destroyed = true
    generation++
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer)
      resizeTimer = null
    }
    resizeObserver.disconnect()
  }
}
