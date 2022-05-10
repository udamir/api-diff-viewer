import React, { useState } from "react"
import { DiffBlockData } from "../../diff-builder/common"
import { DiffLine } from "../DiffLine/DiffLine"

export interface DiffBlockProps {
  /**
   * Line index
   */
  data: DiffBlockData
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
}

export const DiffBlock = ({ data, display = "side-by-side" }: DiffBlockProps) => {
  const [visiable, setVisible] = useState(true)

  const items = data.children.map((line, i) => (<DiffBlock key={i} data={line} display={display} />))

  const tags = data.children.length ? visiable ? ["expanded"] : ["collapsed"] : []

  if (data.tokens.length) {
    if (items.length) {
      return (
        <div className="diff-node">
          <DiffLine data={data} display={display} tags={tags} onClick={() => setVisible(!visiable)} />
          <div style={{ display: visiable ? "block" : "none" }}>{items}</div>
        </div>
      )
    } else {
      return<DiffLine data={data} display={display} tags={tags} onClick={() => setVisible(!visiable)} />
    }
  } else {
    return <div>{items}</div>
  }
}
