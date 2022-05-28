import React from "react"
import styled from "styled-components"
import { DiffType, ActionType } from "api-smart-diff"

import { diffTypes, LineDiff, Token, TokenType } from "../diff-builder/common"

const actionBgColor = {
  add: "#00BB5B12",
  remove: "#ff526112",
  replace: "#FFB02E12",
  rename: "#FFB02E12",
  test: "none",
}

const StyledLine = styled.div<{ action?: ActionType, hidden?: boolean, right?: boolean }>`
  position: relative;
  display: flex;
  font-family: Menlo, Monaco, "Courier New", monospace;
  font-size: 0;
  color: #0451a5;
  margin: 0;
  width: 100%;
  font-weight: normal;
  font-size: 12px;
  line-height: 18px;
  letter-spacing: 0px;
  border-left: ${({ right }) => right ? "solid 1px lightgray;" : "none" };
  background-color: ${({ action, hidden }) => action ? hidden ? "#F2F3F5" : actionBgColor[action] : "white" };
`

const StyledLineNum = styled.span`
  line-height: 18px;  
  padding-left: 10px;
  padding-right: 15px;
  color: #6e7681;
  text-align: right;
  white-space: nowrap;
  font-size: 12px;
  user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
  position: absolute;
  width: 30px;
`

const expandedIcon = `
  margin-left: 43px;
  margin-top: 5px;
  transform: rotate(45deg);
  -webkit-transform: rotate(45deg);
`

const collapsedIcon = `
  margin-left: 41px;
  margin-top: 6px;
  transform: rotate(-45deg);
  -webkit-transform: rotate(-45deg);
`

const StyledToggle = styled.span<{ tags: string[] }>`
  flex: none;
  position: absolute;
  display: ${({ tags }) => (tags.includes("expanded") || tags.includes("collapsed")) ? "inline-block" : "none" };
  flex-flow: row nowrap;
  align-items: center;
  cursor: pointer;

  border: solid lightgray;
  border-width: 0 1px 1px 0;
  padding: 2px;

  margin-left: 43px;
  margin-top: 5px;
  transform: rotate(45deg);
  -webkit-transform: rotate(45deg);

  ${({ tags }) => tags.includes("expanded") ? expandedIcon : ""}
  ${({ tags }) => tags.includes("collapsed") ? collapsedIcon : ""}
`

const StyledLineContent = styled.p<{ hidden?: boolean, indent: number }>`
  word-break: break-word;
  overflow: visible;
  word-wrap: normal;
  text-align: left;
  font-size: 12px;
  display: ${({ hidden }) => hidden ? "none" : "inline-block"};
  margin: 0;
  text-indent: ${({ indent }) => -(indent * 10 + 10)}px;
  padding-left: ${({ indent }) => indent * 10 + 65}px;
`

const diffTypeBgColor = (type: DiffType = "unclassified", opacity: number = 1) => {
  switch (type) {
    case "annotation": return `rgba(186, 85, 211, ${opacity})`
    case "non-breaking": return `rgba(15, 169, 56, ${opacity})`
    case "breaking": return `rgba(235, 0, 0, ${opacity})`
    case "unclassified": return `rgba(169, 169, 169, ${opacity})`
  }
}

const tokenTypeColor: any = {
  spec: "#008080",
  key: "#008080",
  index: "#008080",
  string: "#0451a5",
}

const changeMarker = styled.div<{ hidden?: boolean, type?: DiffType }>``

const StyledChangeMarker = styled(changeMarker)`
  left: -1px;
  position: absolute;
  display: ${({ hidden }) => hidden ? "none" : "block" };
  width: 15px;
  height: 100%;
  z-index: 1;
  overflow: hidden;
  color: transparent; 
  transition: all .3s ease-in-out;
  margin-right: 10px;
  border-left: 3px solid ${({ type }) => diffTypeBgColor(type)};
  user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
  &:hover {
    padding-left: 10px;
    width: 100px;
    color: white; 
    content: attr(data-hover);
    background-color: ${({ type }) => diffTypeBgColor(type, 0.7)};
  }
`

const StyledChangeBadge = styled.span<{ color: string }>`
  margin-left: 4px;
  font-size: 10px;
  min-width: 16px;
  padding: 1px 3px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid darkgray;
  text-indent: -1px;
  text-align: center;
  border-color: ${({ color }) => color || "darkgray"};
  color: ${({ color }) => color || "darkgray"};
  user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
`

const StyledToken = styled.span<{ type?: TokenType, tags?: string[] }>`
  color: ${({ type }) => tokenTypeColor[type || "spec"]};
  ${({ tags }) => tags?.includes("before") ? "text-decoration: line-through; background-color: #FFC8C1;" : "" }
  ${({ tags }) => tags?.includes("after") ? "background-color: #D0FAD4;" : "" }
`

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
  indent = Math.max(indent, 0)

  const hidden = (diff?.action === "add" && !tags.includes("after")) || (diff?.action === "remove" && !tags.includes("before"))
  const right = tags.includes("after") && !tags.includes("before")
  const showMarker = !!diff?.action && tags.includes("before") || ["collapsed", "changed", "before"].every((v) => tags.includes(v))

  const content = tokens.filter((token) => token.tags.every((v) => tags.includes(v))).map((token, i) => 
    diffTypes.includes(token.type as any) 
      ? <StyledChangeBadge key={i} color={diffTypeBgColor(token.type as DiffType)}>{ `${token.type}: ${token.value}` }</StyledChangeBadge> 
      : <StyledToken key={i} {...token}>{ token.value }</StyledToken>
  )

  return (
    <StyledLine action={diff?.action} hidden={hidden} right={right}>
      <StyledChangeMarker hidden={!showMarker} type={diff?.type}>{diff?.type}</StyledChangeMarker>
      <StyledLineNum>{index || ""}</StyledLineNum>
      <StyledToggle tags={tags} />      
      <StyledLineContent hidden={hidden} indent={indent}>
        <span>{" ".repeat(indent).replace(/ /g, "\u00a0")}</span>
        {content}
      </StyledLineContent>
    </StyledLine>
  )
}
