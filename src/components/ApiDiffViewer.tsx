/// <reference lib="dom" />

import React, { useEffect, useState } from "react"
import { BaseRulesType, DiffType } from "api-smart-diff"
import styled, { ThemeProvider } from "styled-components"

import { DiffBlockData, metaKey } from "../diff-builder/common"
import { DiffContext, DiffContextProps } from "../helpers/diff.context"
import { ApiNavigation } from "./ApiNavigation"
import { buildDiffBlock } from "../diff-builder"
import { DiffBlock } from "./DiffBlock"
import { SideBar } from "./SideBar"
import { useAsyncMerge } from "../hooks/useApiMerge"
import { defaultTheme, Theme } from "../themes"

export interface ApiDiffViewerProps {
  /**
   * object before
   */
  before: any
  /**
   * object after
   */
  after: any
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
  /**
   * Api compare rules
   */
  rules?: BaseRulesType
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
   * Custom themes
   */
  customThemes: { [key: string]: Theme }
  /**
   * Lifecycle events
   */
  onLoading?: () => {}
  onReady?: (ctx: DiffContextProps) => {}
}

const StyledLayout = styled.div`
  display: flex;
  flex-direction: row;
`

export const ApiDiffViewer = ({
  before,
  after,
  rules = "JsonSchema",
  display = "side-by-side",
  format = "yaml",
  filters = [],
  navigation = false,
  onLoading,
  onReady,
  customThemes,
}: ApiDiffViewerProps) => {
  const [data, setData] = useState<any>()
  const [treeview, setTreeview] = useState<"expanded" | "collapsed">()
  const [block, setBlock] = useState<DiffBlockData>()
  const [error, setError] = useState("")
  const [selected, setSelected] = useState("")
  const [themeType, setCurrentTheme] = useState("dafault")
  const [themes, setThemes] = useState<{ [key: string]: Theme }>({
    default: defaultTheme,
  })

  useEffect(() => setThemes({ ...themes, ...customThemes }), [])

  useEffect(() => {
    onLoading && onLoading()
    const buildBlock = async () => {
      setData(await useAsyncMerge(before, after, { rules, metaKey, arrayMeta: true }))
    }
    buildBlock().catch(setError)
  }, [before, after, rules])

  useEffect(() => {
    if (!data) {
      return
    }
    setBlock(buildDiffBlock(data, format))
    onReady && onReady(ctx)
  }, [data, format])

  const onNavigate = (id: string) => {
    setSelected(id)
    const block = document.getElementById(id)!
    if (!block) {
      return
    }
    const y = block.getBoundingClientRect().top + window.pageYOffset - 150
    window.scrollTo({ top: y, behavior: "smooth" })
  }

  const theme = themes[themeType] || themes.default
  const ctx = {
    treeview,
    filters,
    display,
    selected,
    theme,
    themeType,
    navigateTo: onNavigate,
    expandAll: () => setTreeview("expanded"),
    collapseAll: () => setTreeview("collapsed"),
    setCurrentTheme,
  }

  return (
    <ThemeProvider theme={theme}>
      <DiffContext.Provider value={ctx}>
        <div id="api-diff-viewer">
          <StyledLayout>
            {navigation && (
              <SideBar>
                <ApiNavigation data={data} diffMetaKey={metaKey} onNavigate={onNavigate} />
              </SideBar>
            )}
            {data && block ? <DiffBlock data={block} /> : <div>Processing...</div>}
            {error && <div>Error: {error}</div>}
          </StyledLayout>
        </div>
      </DiffContext.Provider>
    </ThemeProvider>
  )
}
