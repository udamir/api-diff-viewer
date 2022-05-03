import React from "react"
import { LineData } from "../../utils"
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

const Line = (data: any, display: "before" | "after" | "merged", toggle?: "expand" | "collapse") => {
  const indent = Math.max(data.indent, 0)

  const hidden = (data.action === "add" && display === "before") || (data.action === "remove" && display === "after")
  const itemClass = !data.action ? "" : hidden ? "action-hidden" : `action-${data.action}`
  const itemStyle = {
    textIndent: `${-(indent * 10 + 10)}px`,
    paddingLeft: `${indent * 10 + 65}px`,
  }
  const content = []
  for (const token of data.tokens) {
    if (display !== "merged" && token.display && token.display !== display) {
      continue
    }
    content.push(
      <span key={content.length} className={`token-${token.type}` + (token.display ? ` ${token.display}` : "")}>
        {token.value}
      </span>
    )
  }

  const changeTypes = ["total", "breaking", "non-breaking", "annotation", "unclassified"]
  if (toggle === "collapse") {
    content.push(<span key={content.length} className="collapsed">{data.type === "objectBlock" ? "\u00a0{...}" : "\u00a0[...]"}</span>)
    for (let i = 1; i < data.diffs?.length || 0; i++) {
      if (data.diffs[i] === 0) {
        continue
      }
      content.push(
        <span key={content.length} className={"changes " + changeTypes[i]} title={`${changeTypes[i]}: ${data.diffs[i]}`}>
          {`${changeTypes[i]}: ${data.diffs[i]}`}
        </span>
      )
    }
  }

  return (
    <div
      className={["line", itemClass, ...(display === "after" ? ["right"] : [])].join(" ")}
      title={data.diffType || toggle === "collapse" ? `Changes: ${data.diffs[0]}` : ""}
    >
      {!!data.action && display !== "after" && <div className={`diff ${data.diffType}`}></div>}
      {toggle === "collapse" && !!data.diffs[0] && display !== "after" && <div className={`diff`}></div>}
      <span className="line-num">{data.line}</span>
      {!!toggle && <span className={`toggle icon ${toggle}`}></span>}
      <p className="line-content" style={hidden ? { display: "none" } : { ...itemStyle }}>
        {!!indent && <span className="indent">{" ".repeat(indent).replace(/ /g, "\u00a0")}</span>}
        {content}
      </p>
    </div>
  )
}

export const DiffLine = ({ data, display = "side-by-side", toggle, onClick }: DiffLineProps) => {
  return display === "inline" ? (
    <div className="diff-line" onClick={onClick}>
      {Line(data, "merged", toggle)}
    </div>
  ) : (
    <div className="diff-line" onClick={onClick}>
      {Line(data, "before", toggle)}
      {Line(data, "after", toggle)}
    </div>
  )
}
