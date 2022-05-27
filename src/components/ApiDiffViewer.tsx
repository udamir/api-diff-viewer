import React, { useState } from "react"
import styled from "styled-components"

import { DiffType } from "api-smart-diff"
import { DiffBuilder } from "../diff-builder"
import { DiffBlock } from "./DiffBlock"
import { DiffContext } from "../helpers/context"
import { SideBar } from "./SideBar"
import { NavApiNavigation } from "./ApiNavigation"

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

  return (
    <DiffContext.Provider value={{ treeview, filters, display, selected, navigate: setSelected }}>
      <div id="api-diff-viewer">
        <StyledLayout>
          { navigation && <SideBar><NavApiNavigation rules={rules} data={builder.source} /></SideBar> }
          <DiffBlock data={block} />
        </StyledLayout>
      </div>
    </DiffContext.Provider>
  )
}
