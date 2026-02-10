import { Extension, Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { DiffThemeColors } from './types'

/** Compartment for dynamic theme switching */
export const themeCompartment = new Compartment()

/** Default light theme colors */
const lightColors: Required<DiffThemeColors> = {
  addedBg: 'rgba(46, 160, 67, 0.15)',
  removedBg: 'rgba(248, 81, 73, 0.15)',
  modifiedBg: 'rgba(227, 179, 65, 0.15)',
  breakingColor: '#cf222e',
  nonBreakingColor: '#1a7f37',
  annotationColor: '#8250df',
  unclassifiedColor: '#656d76',
  addedTextBg: 'rgba(46, 160, 67, 0.4)',
  removedTextBg: 'rgba(248, 81, 73, 0.4)',
  spacerBg: '#f6f8fa',
  spacerStripe: '#e1e4e8',
  correspondingHighlight: 'rgba(56, 139, 253, 0.15)',
}

/** Default dark theme colors */
const darkColors: Required<DiffThemeColors> = {
  addedBg: 'rgba(46, 160, 67, 0.2)',
  removedBg: 'rgba(248, 81, 73, 0.2)',
  modifiedBg: 'rgba(227, 179, 65, 0.2)',
  breakingColor: '#f85149',
  nonBreakingColor: '#3fb950',
  annotationColor: '#a371f7',
  unclassifiedColor: '#768390',
  addedTextBg: 'rgba(46, 160, 67, 0.5)',
  removedTextBg: 'rgba(248, 81, 73, 0.5)',
  spacerBg: '#161b22',
  spacerStripe: '#30363d',
  correspondingHighlight: 'rgba(56, 139, 253, 0.2)',
}

/** Create CSS variable declarations from theme colors */
function createCssVars(colors: Required<DiffThemeColors>): Record<string, string> {
  return {
    '--diff-added-bg': colors.addedBg,
    '--diff-removed-bg': colors.removedBg,
    '--diff-modified-bg': colors.modifiedBg,
    '--diff-breaking-color': colors.breakingColor,
    '--diff-non-breaking-color': colors.nonBreakingColor,
    '--diff-annotation-color': colors.annotationColor,
    '--diff-unclassified-color': colors.unclassifiedColor,
    '--diff-added-text-bg': colors.addedTextBg,
    '--diff-removed-text-bg': colors.removedTextBg,
    '--diff-spacer-bg': colors.spacerBg,
    '--diff-spacer-stripe': colors.spacerStripe,
    '--diff-corresponding-highlight': colors.correspondingHighlight,
  }
}

/** Light theme extension */
export const diffThemeLight = EditorView.theme(
  {
    '&': createCssVars(lightColors),
    '.cm-content': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '13px',
      lineHeight: '1.5',
    },
    '.cm-gutters': {
      backgroundColor: '#ffffff',
      border: 'none',
      color: '#656d76',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 16px',
      minWidth: '48px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(234, 238, 242, 0.5)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#eaeef2',
    },
  },
  { dark: false }
)

/** Dark theme extension */
export const diffThemeDark = EditorView.theme(
  {
    '&': createCssVars(darkColors),
    '.cm-content': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '13px',
      lineHeight: '1.5',
    },
    '.cm-gutters': {
      backgroundColor: '#0d1117',
      border: 'none',
      color: '#768390',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 16px',
      minWidth: '48px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(56, 139, 253, 0.1)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1c2128',
    },
  },
  { dark: true }
)

/** Dark syntax highlight style (GitHub-dark inspired) */
const darkHighlightStyle = HighlightStyle.define([
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

/** Create diff theme extension with optional color overrides */
export function diffTheme(options?: {
  dark?: boolean
  colors?: Partial<DiffThemeColors>
}): Extension {
  const { dark = false, colors = {} } = options || {}
  const baseColors = dark ? darkColors : lightColors
  const mergedColors = { ...baseColors, ...colors } as Required<DiffThemeColors>

  const highlight = dark
    ? syntaxHighlighting(darkHighlightStyle)
    : syntaxHighlighting(defaultHighlightStyle)

  return [highlight, EditorView.theme(
    {
      '&': {
        ...createCssVars(mergedColors),
        backgroundColor: dark ? '#0d1117' : '#ffffff',
        color: dark ? '#c9d1d9' : '#1f2328',
      },
      '.cm-scroller': {
        backgroundColor: dark ? '#0d1117' : '#ffffff',
        scrollbarWidth: 'thin',
        scrollbarColor: dark ? '#484f58 #0d1117' : '#c1c7cd #f6f8fa',
      },
      '.cm-scroller::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '.cm-scroller::-webkit-scrollbar-track': {
        background: dark ? '#0d1117' : '#f6f8fa',
      },
      '.cm-scroller::-webkit-scrollbar-thumb': {
        background: dark ? '#484f58' : '#c1c7cd',
        borderRadius: '4px',
      },
      '.cm-scroller::-webkit-scrollbar-thumb:hover': {
        background: dark ? '#6e7681' : '#8b949e',
      },
      '.cm-scroller::-webkit-scrollbar-corner': {
        background: dark ? '#0d1117' : '#f6f8fa',
      },
      '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
        lineHeight: '1.5',
        caretColor: dark ? '#c9d1d9' : '#1f2328',
      },
      '.cm-cursor': {
        borderLeftColor: dark ? '#c9d1d9' : '#1f2328',
      },
      '.cm-gutters': {
        backgroundColor: dark ? '#0d1117' : '#ffffff',
        border: 'none',
        color: dark ? '#768390' : '#656d76',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 4px',
        minWidth: '40px',
      },
      '.cm-activeLine': {
        backgroundColor: 'transparent',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
      },
      '.cm-selectionBackground': {
        backgroundColor: dark ? 'rgba(56, 139, 253, 0.3)' : 'rgba(56, 139, 253, 0.2)',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: dark ? 'rgba(56, 139, 253, 0.4)' : 'rgba(56, 139, 253, 0.3)',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: dark ? '#30363d' : '#eaeef2',
        color: dark ? '#768390' : '#656d76',
        border: `1px solid ${dark ? '#484f58' : '#d0d7de'}`,
      },
      '.cm-foldGutter .cm-gutterElement': {
        fontSize: '14px',
      },
    },
    { dark }
  )]
}

/** Detect if the current view is using dark mode */
export function detectDarkMode(view: EditorView): boolean {
  const root = view.dom.closest('[data-theme]')
  if (root) {
    return root.getAttribute('data-theme') === 'dark'
  }

  // Check prefers-color-scheme
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  return false
}

/** Theme manager for runtime theme switching */
export class DiffThemeManager {
  private currentTheme: Extension | null = null
  private compartment = new Compartment()

  /** Get extensions for initial setup */
  getExtensions(
    baseTheme?: Extension,
    diffColors?: Partial<DiffThemeColors>,
    dark?: boolean
  ): Extension[] {
    const extensions: Extension[] = []

    if (baseTheme) {
      extensions.push(baseTheme)
    }

    const theme = diffTheme({ dark, colors: diffColors })
    extensions.push(this.compartment.of(theme))
    this.currentTheme = theme

    return extensions
  }

  /** Update diff theme at runtime */
  setDiffTheme(
    view: EditorView,
    options: { dark?: boolean; colors?: Partial<DiffThemeColors> }
  ): void {
    const newTheme = diffTheme(options)

    view.dispatch({
      effects: this.compartment.reconfigure(newTheme),
    })

    this.currentTheme = newTheme
  }
}

export { lightColors, darkColors }
