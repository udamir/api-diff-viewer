import React, { useContext, useEffect, useState } from "react"
import styled from "styled-components"

import { DiffBlockData, diffTypes, Token } from "../diff-builder/common"
import { DiffContext } from "../helpers/context"
import { DiffLine } from "./DiffLine"

const StyledDiffNodeItems = styled.div<{ hidden: boolean }>`
  display: ${({ hidden }) => hidden ? "none" : "block"};
`

const StyledBlock = styled.div`
  position: relative;
`

const StyledBlockSelection = styled.div`
  position: absolute;
  display: block;
  width: 15px;
  height: 100%;
  z-index: 1;
  margin-left: 50px;
  border-left: 3px solid blue;
`

export interface DiffBlockProps {
  /**
   * Line index
   */
  data: DiffBlockData
  /**
   * Line is hidden
   */
  hidden?: boolean
}

export const DiffBlock = ({ data, hidden=false }: DiffBlockProps) => {
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
  const lines = data.children.map((line, i) => {
    const hide = visible || treeview !== "filtered" ? false : isHidden(line)
    hiddenItems+= hide ? 1 : 0
    return <DiffBlock key={i} data={line} hidden={hide} />
  })

  const tags = data.children.length ? expanded ? ["expanded"] : ["collapsed"] : []

  if (hidden) {
    tags.push("hidden")
  }

  // const selected = window.location.href.split('#')[1] === data.id

  const removeFilter = { data: { index: 0, indent: data.indent + 2, tokens: [Token.Spec("...")] } }

  return (
    <StyledBlock id={data.id}>
      { selected && selected === data.id && <StyledBlockSelection />}
      { !!data.tokens.length && <DiffLine data={data} tags={tags} onClick={() => setExpanded(!expanded)} /> }
      { !!lines.length && <StyledDiffNodeItems hidden={!expanded && !!data.tokens.length}>{lines}</StyledDiffNodeItems> }
      { !hidden && !!hiddenItems && expanded && <DiffLine {...removeFilter} onClick={() => setVisible(true)} /> }
    </StyledBlock>
  )
}
