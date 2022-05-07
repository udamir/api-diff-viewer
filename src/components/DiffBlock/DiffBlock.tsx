import React, { useState } from "react"
import { ParsedBlock, ParsedLine } from "../../diffParser"
import { DiffLine } from "../DiffLine/DiffLine"

export interface DiffBlockProps {
  /**
   * Line index
   */
  data: ParsedBlock
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
}

export const DiffBlock = ({ data, display = "side-by-side" }: DiffBlockProps) => {
  const [visiable, setVisible] = useState(true)

  const items = data.items.map((line, i) => (
    line instanceof ParsedBlock 
      ? <DiffBlock key={i} data={line} display={display} />
      : <DiffLine key={i} data={line} display={display} />
  ))

  const tags = visiable ? ["expanded"] : ["collapsed"]

  if (data.items[0] instanceof ParsedLine) {
    return (
      <div className="diff-node">
        <DiffLine data={data.items[0]} display={display} tags={tags} onClick={() => setVisible(!visiable)} />
        <div style={{ display: visiable ? "block" : "none" }}>{items.slice(1)}</div>
      </div>
    )
  } else {
    return <div>{items}</div>
  }
}
