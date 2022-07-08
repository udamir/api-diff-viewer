import React, { useContext } from "react"
import "./Line.css"

import { diffTypes, LineDiff, Token } from "../diff-builder/common"
import { DiffContext } from "../helpers/diff.context"

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

export const Line = ({ index, indent, tokens, diff, tags }: LineProps) => {
  const { textSelectionSide, setTextSelectionSide } = useContext(DiffContext)

  const selectedText = window && window.getSelection()?.toString()

  indent = Math.max(indent, 0)
  const contentIndentStyle = {
    textIndent: `${-(indent * 10 + 10)}px`,
    paddingLeft: `${indent * 10 + 65}px`,
  }

  const hidden =
    (diff?.action === "add" && !tags.includes("after")) || (diff?.action === "remove" && !tags.includes("before"))
  const right = tags.includes("after") && !tags.includes("before")
  const showMarker =
    (!!diff?.action && tags.includes("before")) || ["collapsed", "changed", "before"].every((v) => tags.includes(v))

  const content = tokens
    .filter((token) => token.tags.every((v) => tags.includes(v)))
    .map((token, i) =>
      diffTypes.includes(token.type as any) ? (
        <span key={i} className={`change-badge ${token.type} non-selectable`}>{`${token.type}: ${token.value}`}</span>
      ) : (
        <span key={i} className={`token ${token.type} ${token.tags || ""}`}>
          {token.value}
        </span>
      )
    )

  const nonSelectable = (right && textSelectionSide === "before") || (!right && textSelectionSide === "after")
  const lineClass = `line${right ? " right" : ""}${nonSelectable ? " non-selectable" : ""}${
    hidden ? " bg-hidden" : diff?.action ? " bg-" + diff?.action : ""
  }`

  return (
    <div className={lineClass}>
      {showMarker && <div className={`change-marker non-selectable ${diff?.type}`}>{diff?.type}</div>}
      <span className="line-num non-selectable">{index || ""}</span>
      {tags.includes("expanded") && <span className="toggle expanded non-selectable" />}
      {tags.includes("collapsed") && <span className="toggle collapsed non-selectable" />}
      <div
        className={`line-content${hidden ? " hidden" : ""}`}
        style={contentIndentStyle}
        onMouseDown={() => setTextSelectionSide?.(right ? "after" : "before")}
        onMouseUp={() => !selectedText && setTextSelectionSide?.()}
      >
        <span>{" ".repeat(indent).replace(/ /g, "\u00a0")}</span>
        {content}
      </div>
    </div>
  )
}
