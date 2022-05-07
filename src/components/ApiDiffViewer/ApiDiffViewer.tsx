import React from "react"
import { DiffParser, ParsedBlock } from "../../diffParser"
import { DiffBlock } from "../DiffBlock/DiffBlock"
import { DiffLine } from "../DiffLine/DiffLine"

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
  // const visiable = true
  const parser = new DiffParser(before, after, rules)
  const lines = format === "yaml" ? parser.toYamlLines() : parser.toJsonLines()

  const items = lines.map((line, i) => (
    line instanceof ParsedBlock 
      ? <DiffBlock key={i} data={line} display={display} />
      : <DiffLine key={i} data={line} display={display} />
  ))

  return <div className="api-diff-viewer">{items}</div>
}
