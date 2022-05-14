import React, { useRef } from "react"
import styled from "styled-components"

import { DiffType } from "api-smart-diff"
import { DiffBuilder } from "../diff-builder"
import { DiffBlock } from "./DiffBlock"
import { DiffContext } from "../helpers/context"
import { useResize } from "../hooks/useResize"
import { encodeKey } from "../diff-builder/common"

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
}

const StyledLayout = styled.div`
  display: flex;
  flex-direction: row;
`

const StyledSidebar = styled.div`
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 150px;
  max-width: 400px;
  display: flex;
  border-right: #e9e9e9 1px solid;
  flex-direction: row;
  z-index: 2;
`

const StyledSidebarContent = styled.div`
  flex: 1;
`

const StyledSidebarResizer = styled.div`
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 6px;
  justify-self: flex-end;
  cursor: col-resize;
  resize: horizontal;
  :hover {
    width: 3px;
    background: #c1c3c5b4;
  }
`

const methodColor = (method: string) => {
  switch (method) {
    case "get": return "#48bb78"
    case "post": return "#008eff"
    case "put": return "#ed8936"
    case "delete": return "#f56565"
    default: return "#ed8936"
  }
}

const StyledMethod = styled.span<{method: string}>`
  cursor: pointer;
  font-size: 11px;
  opacity: .75;
  margin-right: 0.5rem;
  margin-top: 0.25rem;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({ method}) => methodColor(method)};
  border: none;
  border-radius: 3px;
  line-height: 12px;
  max-width: 100%;
  min-height: 16px;
  min-width: 16px;
  padding: 0px 6px;
  position: relative;

`

const StyledNavRef = styled.a`
  color: #ebf1f5;
  overflow: hidden;
  text-decoration: none;
  font-family: "SF Mono",ui-monospace,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
`

const StyledPath = styled.span`
  font-size: 11px;
  color: black;
  text-overflow: ellipsis;
  text-decoration: none;
  font-family: "SF Mono",ui-monospace,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
`

export const ApiDiffViewer = ({ before, after, rules = "JsonSchema", display = "side-by-side", format="yaml", treeview="expanded", filters=[] }: DiffTreeProps) => {
  const builder = new DiffBuilder(before, after, rules)
  const block = format === "yaml" ? builder.buildYaml() : builder.buildJson()

  const ref = useRef<any>()
  const { initResize } = useResize(ref)

  const nav = []
  if (rules === "OpenApi3") {
    let i = 0
    nav.push(<span key={i++}>Paths:</span>)
    const { paths = [], components = [] } = builder.source
    for (const path in paths) {
      for (const method in paths[path]) {
        const href = `#paths/${encodeKey(path)}/${method}` 
        nav.push(
          <div>
            <StyledNavRef key={i++} href={href}>
              <StyledMethod method={method}>{method.toLocaleUpperCase()}</StyledMethod>
              <StyledPath>{path}</StyledPath> 
            </StyledNavRef>
          </div>)
      }
    }
  }

  return (
    <DiffContext.Provider value={{ treeview, filters, display }}>
      <div id="api-diff-viewer">
        <StyledLayout>
          <StyledSidebar ref={ref}>
            <StyledSidebarContent>
              {nav}
            </StyledSidebarContent>
            <StyledSidebarResizer onMouseDown={initResize} />
          </StyledSidebar>
          <div>
            <DiffBlock data={block} />
          </div>
        </StyledLayout>
      </div>
    </DiffContext.Provider>
  )
}
