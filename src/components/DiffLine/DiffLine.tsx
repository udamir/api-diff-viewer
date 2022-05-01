import React from 'react';
import { LineData } from '../../utils';
import './DiffLine.css';

interface DiffLineProps {
  /**
   * Parsed line data
   */
  data: LineData;
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
}

const Line = (data: any, display: 'before' | 'after' | 'merged') => {

  const indent = Math.max(data.indent, 0)

  const hidden = data.action === "add" && display === "before" || data.action === "remove" && display === "after";
  const itemClass = !data.action ? "" : hidden ? "action-hidden" : `action-${data.action}`;
  const itemStyle = {
    textIndent: `${-(indent * 10 + 10)}px`, 
    paddingLeft: `${indent * 10 + 65}px`
  }
  const content = []
  let i = 0
  for (const token of data.tokens) {
    if (display !== "merged" && token.display && token.display !== display) { continue }
    content.push(<span key={i++} className={`token-${token.type}`+ (token.display ? ` ${token.display}` : '')}>{ token.value }</span>)
  }

  return (
    <div className={["line", itemClass, ...display==="after" ? ["right"] : []].join(" ")}>
      <span className="line-num">{ data.line }</span>
      <p className="line-content" style={ hidden ? { display: "none" } : { ...itemStyle } }>
        { !!indent && <span className="indent">{ " ".repeat(indent).replace(/ /g, "\u00a0") }</span> }
        { content }
      </p>
    </div>
  );
};

export const DiffLine = ({ data, display = "side-by-side" }: DiffLineProps) => {
  return display === "inline" 
    ? <div className="diff-line">{ Line(data, "merged") }</div>
    : <div className="diff-line">{ Line(data, "before") }{ Line(data, "after") }</div>
}
