import { createDiffViewer } from '../src/index.ts'
import { EditorView, lineNumbers, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { foldGutter, syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import jsyaml from 'js-yaml'
import { samples } from './samples.js'

// ── State ──

let viewer = null
let beforeEditor = null
let afterEditor = null
let updateTimer = null
const beforeTheme = new Compartment()
const afterTheme = new Compartment()

// ── DOM refs ──

const diffContainer = document.getElementById('diff-container')
const summaryEl = document.getElementById('summary')
const sampleSelect = document.getElementById('sample-select')
const modeToggle = document.getElementById('mode-toggle')
const formatToggle = document.getElementById('format-toggle')
const wordDiffSelect = document.getElementById('word-diff-select')
const foldingCheck = document.getElementById('folding-check')
const classificationCheck = document.getElementById('classification-check')
const wordwrapCheck = document.getElementById('wordwrap-check')
const filterGroup = document.getElementById('filter-group')
const darkToggle = document.getElementById('dark-toggle')

// ── Helpers ──

function parseContent(text) {
  text = text.trim()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return jsyaml.load(text)
  }
}

function isDark() {
  return document.body.classList.contains('dark')
}

function getToggleValue(container) {
  return container.querySelector('.active').dataset.value
}

function bindToggle(container, onChange) {
  for (const btn of container.querySelectorAll('button')) {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return
      container.querySelector('.active').classList.remove('active')
      btn.classList.add('active')
      onChange(btn.dataset.value)
    })
  }
}

// ── GitHub-style themes for input editors ──

const ghDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#ff7b72' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#c9d1d9' },
  { tag: [t.propertyName], color: '#79c0ff' },
  { tag: [t.function(t.variableName), t.labelName], color: '#d2a8ff' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#79c0ff' },
  { tag: [t.definition(t.name), t.separator], color: '#c9d1d9' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#ffa657' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#79c0ff' },
  { tag: [t.meta, t.comment], color: '#8b949e' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#58a6ff', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#79c0ff' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#79c0ff' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#a5d6ff' },
  { tag: t.invalid, color: '#f97583' },
])

const ghLightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#cf222e' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#1f2328' },
  { tag: [t.propertyName], color: '#0550ae' },
  { tag: [t.function(t.variableName), t.labelName], color: '#8250df' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#0550ae' },
  { tag: [t.definition(t.name), t.separator], color: '#1f2328' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#953800' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#0550ae' },
  { tag: [t.meta, t.comment], color: '#6e7781' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#0969da', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#0550ae' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#0550ae' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#0a3069' },
  { tag: t.invalid, color: '#82071e' },
])

const darkEditorTheme = [
  EditorView.theme({
    '&': { backgroundColor: '#0d1117', color: '#c9d1d9' },
    '.cm-content': {
      caretColor: '#c9d1d9',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '13px',
      lineHeight: '1.5',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#c9d1d9' },
    '.cm-selectionBackground': { backgroundColor: 'rgba(56, 139, 253, 0.3)' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(56, 139, 253, 0.4)' },
    '.cm-gutters': { backgroundColor: '#161b22', color: '#768390', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: '#1c2128' },
    '.cm-activeLine': { backgroundColor: 'rgba(56, 139, 253, 0.1)' },
    '.cm-foldPlaceholder': {
      backgroundColor: '#30363d',
      color: '#768390',
      border: '1px solid #484f58',
    },
    '.cm-scroller': {
      scrollbarWidth: 'thin',
      scrollbarColor: '#484f58 #0d1117',
    },
    '.cm-scroller::-webkit-scrollbar': { width: '8px', height: '8px' },
    '.cm-scroller::-webkit-scrollbar-track': { background: '#0d1117' },
    '.cm-scroller::-webkit-scrollbar-thumb': { background: '#484f58', borderRadius: '4px' },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': { background: '#6e7681' },
  }, { dark: true }),
  syntaxHighlighting(ghDarkHighlight),
]

const lightEditorTheme = [
  EditorView.theme({
    '&': { backgroundColor: '#ffffff', color: '#1f2328' },
    '.cm-content': {
      caretColor: '#1f2328',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '13px',
      lineHeight: '1.5',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#1f2328' },
    '.cm-selectionBackground': { backgroundColor: 'rgba(56, 139, 253, 0.2)' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(56, 139, 253, 0.3)' },
    '.cm-gutters': { backgroundColor: '#f6f8fa', color: '#656d76', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: '#eaeef2' },
    '.cm-activeLine': { backgroundColor: 'rgba(234, 238, 242, 0.5)' },
    '.cm-foldPlaceholder': {
      backgroundColor: '#eaeef2',
      color: '#656d76',
      border: '1px solid #d0d7de',
    },
    '.cm-scroller': {
      scrollbarWidth: 'thin',
      scrollbarColor: '#c1c7cd #f6f8fa',
    },
    '.cm-scroller::-webkit-scrollbar': { width: '8px', height: '8px' },
    '.cm-scroller::-webkit-scrollbar-track': { background: '#f6f8fa' },
    '.cm-scroller::-webkit-scrollbar-thumb': { background: '#c1c7cd', borderRadius: '4px' },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': { background: '#8b949e' },
  }),
  syntaxHighlighting(ghLightHighlight),
]

// ── Input editors ──

function createInputEditor(container, content) {
  const themeCompartment = container.id === 'editor-before' ? beforeTheme : afterTheme

  const view = new EditorView({
    parent: container,
    state: EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        foldGutter(),
        history(),
        yaml(),
        json(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        themeCompartment.of(isDark() ? darkEditorTheme : lightEditorTheme),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) scheduleUpdate()
        }),
      ],
    }),
  })

  return view
}

function setEditorContent(editor, text) {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: text },
  })
}

// ── Viewer ──

function scheduleUpdate() {
  clearTimeout(updateTimer)
  updateTimer = setTimeout(updateViewer, 300)
}

function updateViewer() {
  const beforeText = beforeEditor.state.doc.toString()
  const afterText = afterEditor.state.doc.toString()

  let before, after
  try {
    before = parseContent(beforeText)
  } catch (e) {
    console.warn('Before: parse error', e)
    return
  }
  try {
    after = parseContent(afterText)
  } catch (e) {
    console.warn('After: parse error', e)
    return
  }

  if (viewer) {
    try {
      viewer.update(before, after)
    } catch (e) {
      console.warn('Update error', e)
    }
  } else {
    createViewer(before, after)
  }
}

function createViewer(before, after) {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }

  try {
    viewer = createDiffViewer(diffContainer, before, after, {
      mode: getToggleValue(modeToggle),
      format: getToggleValue(formatToggle),
      wordDiffMode: wordDiffSelect.value,
      dark: isDark(),
      enableFolding: foldingCheck.checked,
      showClassification: classificationCheck.checked,
      wordWrap: wordwrapCheck.checked,
      filters: getFilters(),
      useWorker: false,
    })

    viewer.on('ready', ({ summary }) => {
      updateFilterCounts(summary)
      summaryEl.textContent = `${summary.total} changes`

    })

    viewer.on('error', ({ message }) => {
      console.warn('Viewer error:', message)
    })
  } catch (e) {
    console.warn('Init error', e)
  }
}

function getFilters() {
  return Array.from(filterGroup.querySelectorAll('.filter-btn.active'))
    .map((btn) => btn.dataset.filter)
}

function updateFilterCounts(summary) {
  const counts = {
    breaking: summary.breaking,
    'non-breaking': summary.nonBreaking,
    annotation: summary.annotation,
    unclassified: summary.unclassified,
  }
  for (const btn of filterGroup.querySelectorAll('.filter-btn')) {
    const count = counts[btn.dataset.filter] ?? 0
    btn.querySelector('.filter-count').textContent = count
  }
}

// ── Samples ──

function loadSample(key) {
  const sample = samples[key]
  if (!sample) return

  const beforeText = jsyaml.dump(sample.before, { lineWidth: -1, noRefs: true })
  const afterText = jsyaml.dump(sample.after, { lineWidth: -1, noRefs: true })

  setEditorContent(beforeEditor, beforeText)
  setEditorContent(afterEditor, afterText)

  // Immediate update instead of debounced
  clearTimeout(updateTimer)
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
  createViewer(sample.before, sample.after)
}

// ── Controls ──

function bindControls() {
  sampleSelect.addEventListener('change', () => loadSample(sampleSelect.value))

  bindToggle(modeToggle, (value) => {
    if (viewer) viewer.setMode(value)
  })

  bindToggle(formatToggle, (value) => {
    if (viewer) viewer.setFormat(value)
  })

  wordDiffSelect.addEventListener('change', () => {
    if (viewer) viewer.setWordDiffMode(wordDiffSelect.value)
  })

  foldingCheck.addEventListener('change', () => {
    if (viewer) viewer.setFoldingEnabled(foldingCheck.checked)
  })

  classificationCheck.addEventListener('change', () => {
    if (viewer) viewer.setClassificationEnabled(classificationCheck.checked)
  })

  wordwrapCheck.addEventListener('change', () => {
    if (viewer) viewer.setWordWrap(wordwrapCheck.checked)
  })

  for (const btn of filterGroup.querySelectorAll('.filter-btn')) {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active')
      if (viewer) viewer.setFilters(getFilters())
    })
  }

  darkToggle.addEventListener('click', toggleDarkMode)
}

// ── Dark mode ──

function applyDarkMode(dark) {
  document.body.classList.toggle('dark', dark)
  darkToggle.textContent = dark ? 'Light' : 'Dark'

  if (beforeEditor) {
    beforeEditor.dispatch({
      effects: beforeTheme.reconfigure(dark ? darkEditorTheme : lightEditorTheme),
    })
  }
  if (afterEditor) {
    afterEditor.dispatch({
      effects: afterTheme.reconfigure(dark ? darkEditorTheme : lightEditorTheme),
    })
  }

  if (viewer) viewer.setTheme({ dark })
}

function toggleDarkMode() {
  applyDarkMode(!isDark())
}

// ── Resize handles ──

function setupResize() {
  const handles = document.querySelectorAll('.resize-handle')

  handles.forEach((handle) => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const leftPanel = handle.previousElementSibling
      const rightPanel = handle.nextElementSibling
      const startX = e.clientX
      const leftWidth = leftPanel.getBoundingClientRect().width
      const rightWidth = rightPanel.getBoundingClientRect().width
      const totalWidth = leftWidth + rightWidth

      handle.classList.add('active')
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      const onMouseMove = (e) => {
        const delta = e.clientX - startX
        let newLeft = leftWidth + delta
        let newRight = rightWidth - delta

        // Clamp to min width
        if (newLeft < 150) {
          newLeft = 150
          newRight = totalWidth - 150
        }
        if (newRight < 150) {
          newRight = 150
          newLeft = totalWidth - 150
        }

        leftPanel.style.flexBasis = `${newLeft}px`
        rightPanel.style.flexBasis = `${newRight}px`
      }

      const onMouseUp = () => {
        handle.classList.remove('active')
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    })
  })
}

// ── Init ──

function init() {
  // Detect system theme
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
  if (prefersDark.matches) {
    document.body.classList.add('dark')
    darkToggle.textContent = 'Light'
  }
  prefersDark.addEventListener('change', (e) => applyDarkMode(e.matches))

  // Populate sample selector
  for (const [key, sample] of Object.entries(samples)) {
    const opt = document.createElement('option')
    opt.value = key
    opt.textContent = sample.label
    sampleSelect.appendChild(opt)
  }

  // Create input editors
  const firstSample = samples[Object.keys(samples)[0]]
  const beforeText = jsyaml.dump(firstSample.before, { lineWidth: -1, noRefs: true })
  const afterText = jsyaml.dump(firstSample.after, { lineWidth: -1, noRefs: true })

  beforeEditor = createInputEditor(document.getElementById('editor-before'), beforeText)
  afterEditor = createInputEditor(document.getElementById('editor-after'), afterText)

  // Bind controls and resize
  bindControls()
  setupResize()

  // Create initial viewer
  createViewer(firstSample.before, firstSample.after)
}

init()
