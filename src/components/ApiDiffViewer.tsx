import React, { useState } from "react"
import styled from "styled-components"

import { DiffContext } from "../helpers/diff.context"
import { ApiNavigation } from "./ApiNavigation"
import { DiffBuilder } from "../diff-builder"
import { DiffType } from "api-smart-diff"
import { DiffBlock } from "./DiffBlock"
import { SideBar } from "./SideBar"

export interface DiffTreeProps {
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
  rules?: "OpenApi3" | "AsyncApi2" | "JsonSchema"
  /**
   * Output format
   */
  format?: "json" | "yaml"
  /**
   * Treeview parameters
   */
  treeview?: "expanded" | "collapsed" | "filtered"
  /**
   * Change filters for filtered treeview
   */
  filters?: DiffType[]
  /**
   * Show navigation sidebar
   */
  navigation?: boolean
}

const StyledLayout = styled.div`
  display: flex;
  flex-direction: row;
`

export const ApiDiffViewer = ({ before, after, rules = "JsonSchema", display = "side-by-side", format="yaml", treeview="expanded", filters=[], navigation = false }: DiffTreeProps) => {
  const builder = new DiffBuilder(before, after, rules)
  const block = format === "yaml" ? builder.buildYaml() : builder.buildJson()
  const [selected, setSelected] = useState("")

  const navigate = (id: string) => {
    setSelected(id)
    const block = document.getElementById(id)!
    if (!block) { return }
    const y = block.getBoundingClientRect().top + window.pageYOffset - 150;
    window.scrollTo({top: y, behavior: 'smooth'});
  }

  return (
    <DiffContext.Provider value={{ treeview, filters, display, selected, navigate }}>
      <div id="api-diff-viewer">
        <StyledLayout>
          { navigation && <SideBar><ApiNavigation data={builder.source} navigate={navigate} /></SideBar> }
          <DiffBlock data={block} />
        </StyledLayout>
      </div>
    </DiffContext.Provider>
  )
}
