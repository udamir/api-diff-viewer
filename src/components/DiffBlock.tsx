import React, { useContext, useEffect, useState } from "react"

import { DiffBlockData, diffTypes, Token } from "../diff-builder/common"
import { DiffContext } from "../helpers/diff.context"
import { DiffLine } from "./DiffLine"
import "./DiffBlock.css"

export interface DiffBlockProps {
  /**
   * Line index
   */
  data: DiffBlockData
  /**
   * Line is hidden
   */
  hidden?: boolean
  /**
   * Filters need to be applied to Line
   */
  filtered?: boolean
}

export const DiffBlock = ({ data, hidden=false, filtered=false }: DiffBlockProps) => {
  const [expanded, setExpanded] = useState(true)
  const [visible, setVisible] = useState(false)
  const { treeview = "expanded", filters, selected } = useContext(DiffContext)

  useEffect(() => {
    setExpanded(!(treeview === "collapsed"))
    setVisible(false)
  }, [treeview, filters])

  const isHidden = (item: DiffBlockData) => {
    for (const filter of filters || []) {
      if (item.diffs[diffTypes.indexOf(filter)] || item.diff?.type === filter) {
        return false
      }
    }
    return true
  }

  let hiddenItems = 0
  let lines = data.children.map((line, i) => {
    const hide = visible || !filtered ? false : isHidden(line)
    hiddenItems += hide ? 1 : 0
    return <DiffBlock key={i} data={line} hidden={hide} filtered={visible ? false : filtered} />
  })

  const tags = data.children.length ? expanded ? ["expanded"] : ["collapsed"] : []

  if (hidden) {
    tags.push("hidden")
  }

  const removeFilter = { data: { index: 0, indent: data.indent + 2, tokens: [Token.Spec("...")] } }

  return (
    <div id={data.id} className="block">
      { selected && selected === data.id && <div className="block-selection" />}
      { !!data.tokens.length && <DiffLine data={data} tags={tags} onClick={() => setExpanded(!expanded)} /> }
      { !!lines.length && (expanded || !data.tokens.length) && <div>{lines}</div> }
      { !hidden && !!hiddenItems && expanded && <DiffLine {...removeFilter} onClick={() => setVisible(true)} /> }
    </div>
  )
}
