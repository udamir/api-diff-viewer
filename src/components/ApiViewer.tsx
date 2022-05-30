/// <reference lib="dom" />

import React, { useEffect, useState } from "react"
import styled, { ThemeProvider } from "styled-components"

import { DiffContext, DiffContextProps } from "../helpers/diff.context"
import { DiffBlockData, metaKey } from "../diff-builder/common"
import { ApiNavigation } from "./ApiNavigation"
import { buildDiffBlock } from "../diff-builder"
import { defaultTheme, Theme } from "../themes"
import { DiffBlock } from "./DiffBlock"
import { SideBar } from "./SideBar"

export interface ApiViewerProps {
  /**
   * Api spec
   */
  data: any
  /**
   * Output format
   */
  format?: "json" | "yaml"
  /**
   * Change filters for filtered treeview
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

export const ApiViewer = ({ data, format="yaml", navigation = false, customThemes, onReady, onLoading }: ApiViewerProps) => {
  const [treeview, setTreeview] = useState<"expanded" | "collapsed">()
  const [block, setBlock] = useState<DiffBlockData>()
  const [selected, setSelected] = useState("")
  const [themeType, setCurrentTheme] = useState('dafault');
  const [themes, setThemes] = useState<{[key:string]: Theme}>({
    default: defaultTheme
  })

  useEffect(() => {
    setThemes({ ...themes, ...customThemes })
  }, [])

  useEffect(() => {
    onLoading && onLoading()
    setBlock(buildDiffBlock(data, format))
    onReady && onReady(ctx)
  }, [data, format])
 
  const onNavigate = (id: string) => {
    setSelected(id)
    const el = document.getElementById(id)!
    if (!el) { return }
    const y = el.getBoundingClientRect().top + window.pageYOffset - 150;
    window.scrollTo({top: y, behavior: 'smooth'});
  }

  const theme = themes[themeType] || themes.default
  const ctx: DiffContextProps = { treeview, selected, display: "inline", themeType, setCurrentTheme, theme,
    expandAll: () => setTreeview("expanded"),
    collapseAll: () => setTreeview("collapsed"),
  }

  return (
    <ThemeProvider theme={theme}>
      <DiffContext.Provider value={ctx}>
        <div id="api-viewer">
          <StyledLayout>
            { navigation && <SideBar><ApiNavigation data={data} diffMetaKey={metaKey} onNavigate={onNavigate} /></SideBar> }
            { data && block ? <DiffBlock data={block} /> : <div>Processing...</div> }
          </StyledLayout>
        </div>
      </DiffContext.Provider>
    </ThemeProvider>
  )
}
