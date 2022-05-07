import React from "react"
import { ParsedLine } from "../../diffParser"
import { Line } from "../Line/Line"
import "./DiffLine.css"

export interface DiffLineProps {
  /**
   * Line data
   */
  data: ParsedLine
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
  /**
   * Show block expanded or collapsed
   */
  tags?: string[]
  onClick?: () => any
}

export const DiffLine = ({ data, display = "side-by-side", tags = [], onClick }: DiffLineProps) => (
  <div className="diff-line" onClick={onClick}>
    {display === "inline" 
      ? ( <Line {...data} tags={["before", "after", ...tags]} /> ) 
      : ([
          <Line key="before" {...data} tags={["before", ...tags]} />,
          <Line key="after" {...data} tags={["after", ...tags]} className="right" />,
        ])
    }
  </div>
)
