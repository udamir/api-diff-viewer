import React from "react"
import { DiffBuilder } from "../../diff-builder"
import { DiffBlock } from "../DiffBlock/DiffBlock"


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
}

export const ApiDiffViewer = ({ before, after, rules = "JsonSchema", display = "side-by-side", format="yaml" }: DiffTreeProps) => {
  const builder = new DiffBuilder(before, after, rules)
  const block = format === "yaml" ? builder.buildYaml() : builder.buildJson()

  return (
    <div className="api-diff-viewer">
      <DiffBlock data={block} display={display} />
    </div>
  )
}
