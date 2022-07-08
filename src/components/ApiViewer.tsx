/// <reference lib="dom" />

import React, { CSSProperties, useEffect, useRef, useState } from "react"

import { DiffContext, DiffContextProps } from "../helpers/diff.context"
import { DiffBlockData, metaKey } from "../diff-builder/common"
import { ApiNavigation } from "./ApiNavigation"
import { buildDiffBlock } from "../diff-builder"
import { defaultThemes, Theme } from "../theme"
import { DiffBlock } from "./DiffBlock"
import "./ApiViewer.css"

export interface ApiViewerProps {
  /**
   * Api spec
   */
  data: object | string
  /**
   * Output format
   */
  format?: "json" | "yaml"
  /**
   * Show navigation sidebar
   */
  navigation?: boolean
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

export const ApiViewer = ({ data, format="yaml", navigation = false, customThemes, height = "100vh", onReady, onLoading, onError }: ApiViewerProps) => {
  const [treeview, setTreeview] = useState<"expanded" | "collapsed">()
  const [block, setBlock] = useState<DiffBlockData>()
  const [selected, setSelected] = useState("")
  const [themeType, setCurrentTheme] = useState('dafault');
  const layout = useRef<HTMLDivElement>(null)
  const viewer = useRef<HTMLDivElement>(null)
  const [themes, setThemes] = useState<{[key:string]: Theme}>({})

  useEffect(() => {
    setThemes({ ...defaultThemes, ...customThemes })
  }, [])

  useEffect(() => {
    onLoading && onLoading()
    try {
      const _data = typeof data === "string" ? JSON.parse(data) : data
      setBlock(buildDiffBlock(_data, format))
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
  const ctx: DiffContextProps = { treeview, selected, display: "inline", themeType, setCurrentTheme, theme,
    expandAll: () => setTreeview("expanded"),
    collapseAll: () => setTreeview("collapsed"),
  }

  return (
    <DiffContext.Provider value={ctx}>
      <div id="api-viewer" ref={layout} style={{...theme as CSSProperties, height }}>
        { navigation && <ApiNavigation data={data} diffMetaKey={metaKey} onNavigate={onNavigate} /> }
        <div ref={viewer} className="viewer">
          { data && block ? <DiffBlock data={block} /> : <div>Processing...</div> }
        </div>
      </div>
    </DiffContext.Provider>
  )
}
