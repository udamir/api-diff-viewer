import React from "react"
import { compare } from "../../dumpYaml"
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
}

export const ApiDiffViewer = ({ before, after, rules = "JsonSchema", display = "side-by-side" }: DiffTreeProps) => {
  // const visiable = true
  const lines = compare(before, after, rules)

  return <div className="api-diff-viewer">{lines.map((line) => <DiffBlock key={line.line} data={line} display={display} />)}</div>
}
