import React from "react"
import { diffTypes, LineDiff, Token } from "../../diff-builder/common"
import "./Line.css"

export interface LineProps {
  /**
   * Line index
   */
  index: number
  /**
   * Line indent
   */
  indent: number
  /**
   * Line tokens
   */
  tokens: Token[]
  /**
   * Line diff data
   */
  diff?: LineDiff
  /**
   * Display conditions
   */
  tags: string[]
  /**
   * Custom class
   */
  className?: string
}

export const Line = ({ index, indent, tokens, diff, tags, className}: LineProps) => {
  indent = Math.max(indent, 0)

  const hidden = (diff?.action === "add" && !tags.includes("after")) || (diff?.action === "remove" && !tags.includes("before"))
  const itemClass = !diff?.action ? "" : hidden ? "action-hidden" : `action-${diff.action}`
  const itemStyle = {
    textIndent: `${-(indent * 10 + 10)}px`,
    paddingLeft: `${indent * 10 + 65}px`,
  }
  const content = tokens.filter((token) => token.tags.every((v) => tags.includes(v))).map((token, i) => (
    <span key={i} className={`token-${token.type} ${token.tags.join(" ")}`.trim()}>
      { diffTypes.includes(token.type as any) ? `${token.type}: ${token.value}` : token.value}
    </span>
  ))

  return (
    <div className={["line", itemClass, className].join(" ")}>
      {/* change marker */}
      {!!diff?.action && tags.includes("before") && <div className={`diff ${diff.type}`}></div>}
      {["collapsed", "changed", "before"].every((v) => tags.includes(v)) && <div className={`diff`}></div>}
      
      {/* line number */}
      <span className="line-num">{index}</span>
      
      {/* toggle icon */}
      {tags.includes("collapsed") && <span className={`toggle icon collapse`}></span>}
      {tags.includes("expanded") && <span className={`toggle icon expand`}></span>}
      
      {/* line tokens */}
      <p className="line-content" style={hidden ? { display: "none" } : { ...itemStyle }}>
        {!!indent && <span className="indent">{" ".repeat(indent).replace(/ /g, "\u00a0")}</span>}
        {content}
      </p>
    </div>
  )
}
