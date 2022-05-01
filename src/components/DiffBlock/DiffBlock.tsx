import React from "react"
import { LineData } from "../../utils"
import { DiffLine } from "../DiffLine/DiffLine"

interface DiffBlockProps {
  /**
   * Parsed line data
   */
  data: LineData
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
}

export const DiffBlock = ({ data, display = "side-by-side" }: DiffBlockProps) => {
  const visiable = true

  const children =
    data.children?.map((line) => (
      <DiffBlock key={line.line} data={line} display={display} />
    )) || []

  return (
    <div className="diff-node">
      <DiffLine data={data} display={display} />
      <div style={{ display: visiable ? "block" : "none" }}>{children}</div>
    </div>
  )
}
