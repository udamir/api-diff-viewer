import React, { CSSProperties, useEffect, useRef, useState } from "react"
import { apiMerge, DiffType, CompareRules } from "api-smart-diff"

import { DiffContext, DiffContextProps } from "../helpers/diff.context"
import { DiffBlockData, metaKey } from "../diff-builder/common"
import { useMergeWorker } from "../hooks/useApiMerge"
import { ApiNavigation } from "./ApiNavigation"
import { buildDiffBlock } from "../diff-builder"
import { Theme, defaultThemes } from "../theme"
import { DiffBlock } from "./DiffBlock"
import "./ApiDiffViewer.css"

export interface ApiDiffViewerProps {
  /**
   * object before
   */
  before: object | string
  /**
   * object after
   */
  after: object | string
  /**
   * Custom merge rules (ignored if useWorker is true)
   */
  rules?: CompareRules
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
  /**
   * Output format
   */
  format?: "json" | "yaml"
  /**
   * Change filters for filtered treeview
   */
  filters?: DiffType[]
  /**
   * Show navigation sidebar
   */
  navigation?: boolean
  /**
   * Use web worker for processing, default true
   */
  useWorker?: boolean
  /**
   * Custom themes
   */
  customThemes?: { [key: string]: Theme }
  /**
   * Component height, default "100vh"
   */
  height?: string
  /**
   * Lifecycle events
   */
  onLoading?: () => void
  onReady?: (ctx: DiffContextProps) => void
  onError?: (error: string) => void
}

export const ApiDiffViewer = ({
  before,
  after,
  display = "side-by-side",
  format = "yaml",
  filters = [],
  rules,
  navigation = false,
  useWorker = true,
  height = "100vh",
  onLoading,
  onReady,
  onError,
  customThemes,
}: ApiDiffViewerProps) => {
  const [data, setData] = useState<any>()
  const [treeview, setTreeview] = useState<"expanded" | "collapsed">()
  const [block, setBlock] = useState<DiffBlockData>()
  const [textSelectionSide, setTextSelectionSide] = useState<"before" | "after">()
  const [selected, setSelected] = useState("")
  const [themeType, setCurrentTheme] = useState("dafault")
  const [themes, setThemes] = useState<{ [key: string]: Theme }>({})
  const merge = useMergeWorker(setData, onError)
  const layout = useRef<HTMLDivElement>(null)
  const viewer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setThemes({ ...defaultThemes, ...customThemes }) 
  }, [])
  // useEffect(() => console.timeEnd("render"))

  useEffect(() => {
    onLoading && onLoading()
    // console.time("merge")
    setData(null)

    try {
      const _before = typeof before === "string" ? JSON.parse(before) : before
      const _after = typeof after === "string" ? JSON.parse(after) : after


      if (useWorker) {
        merge(_before, _after, { metaKey, arrayMeta: true })
      } else {
        setData(apiMerge(_before, _after, { metaKey, arrayMeta: true, rules }))
      }
    } catch (error) {
      onError && onError("Unexpected data")
    }
  }, [before, after])

  useEffect(() => {
    if (!data) { return }
    try {
      setBlock(buildDiffBlock(data, format))
      onReady && onReady(ctx)
    } catch (error) {
      onError && onError("Diff cannot be build, unexpected data!")
    }
  }, [data, format])

  useEffect(() => {
    if (layout.current?.style) {
      layout.current.style.height = height || "100vh"
    }
  }, [height])

  const onNavigate = (id: string) => {
    setSelected(id)
    const block = document.getElementById(id)!
    if (!block || !viewer.current) { return }
    const offset = viewer.current.scrollTop
    const y = block.getBoundingClientRect().top + offset - 150
    viewer.current.scrollTo({ top: y, behavior: "smooth" })
  }

  const theme = themes[themeType] || themes.default
  const ctx = {
    data,
    treeview,
    filters,
    display,
    selected,
    theme,
    themeType,
    textSelectionSide,
    setTextSelectionSide,
    navigateTo: onNavigate,
    expandAll: () => setTreeview("expanded"),
    collapseAll: () => setTreeview("collapsed"),
    setCurrentTheme,
  }

  return (
    <DiffContext.Provider value={ctx}>
      <div id="api-diff-viewer" ref={layout} style={{...theme as CSSProperties, height }}>
        {navigation && <ApiNavigation data={data} theme={theme} diffMetaKey={metaKey} onNavigate={onNavigate} />}
        <div ref={viewer} className="diff-viewer">
          {data && block ? <DiffBlock data={block} filtered={!!filters.length} /> : <div>Processing...</div>}
        </div>
      </div>
    </DiffContext.Provider>
  )
}
