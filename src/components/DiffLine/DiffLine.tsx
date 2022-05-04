import React from "react"
import { LineData } from "../../utils"
import { Line } from "../Line/Line"
import "./DiffLine.css"

export interface DiffLineProps {
  /**
   * Parsed line data
   */
  data: LineData
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
  /**
   * Show block expanded or collapsed
   */
  toggle?: "expand" | "collapse"

  onClick?: () => any
}

export const DiffLine = ({ data, display = "side-by-side", toggle, onClick }: DiffLineProps) => (
  <div className="diff-line" onClick={onClick}>
    {display === "inline" ? (
      <Line data={data} display="merged" toggle={toggle} />
    ) : (
      [
        <Line key="before" data={data} display="before" toggle={toggle} />,
        <Line key="after" data={data} display="after" toggle={toggle} />,
      ]
    )}
  </div>
)
