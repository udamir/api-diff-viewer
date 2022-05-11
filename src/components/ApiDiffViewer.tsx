import React from "react"
import { DiffType } from "api-smart-diff"
import { DiffBuilder } from "../diff-builder"
import { DiffBlock } from "./DiffBlock"
import { DiffContext } from "../helpers/context"

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

export const ApiDiffViewer = ({ before, after, rules = "JsonSchema", display = "side-by-side", format="yaml", treeview="expanded", filters=[] }: DiffTreeProps) => {
  const builder = new DiffBuilder(before, after, rules)
  const block = format === "yaml" ? builder.buildYaml() : builder.buildJson()

  return (
    <DiffContext.Provider value={{ treeview, filters, display }}>
      <div id="api-diff-viewer">
        <DiffBlock data={block} />
      </div>
    </DiffContext.Provider  >
  )
}
