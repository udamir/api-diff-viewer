import React, { useState } from "react"
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
  const [visiable, setVisible] = useState(true)

  const children =
    data.children?.map((line) => (
      <DiffBlock key={line.line} data={line} display={display} />
    )) || []

  return (
    <div className="diff-node">
      <DiffLine data={data} display={display} toggle={data.children ? visiable ? "expand" : "collapse" : undefined } onClick={() => setVisible(!visiable)} />
      <div style={{ display: visiable ? "block" : "none" }}>{children}</div>
    </div>
  )
}
