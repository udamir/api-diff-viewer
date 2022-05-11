import React, { useContext, useEffect, useState } from "react"
import { DiffBlockData, diffTypes } from "../diff-builder/common"
import { DiffLine } from "./DiffLine"
import { DiffContext } from "../helpers/context"
import styled from "styled-components"

const StyledDiffNodeItems = styled.div<{ hidden: boolean }>`
  display: ${({ hidden }) => hidden ? "none" : "block"};
`

export interface DiffBlockProps {
  /**
   * Line index
   */
  data: DiffBlockData
}

export const DiffBlock = ({ data }: DiffBlockProps) => {
  const [visiable, setVisible] = useState(true)
  const { treeview = "expanded", filters } = useContext(DiffContext)
  useEffect(() => {
    if (treeview === "collapsed" ) { 
      return setVisible(false) 
    } else if (treeview === "expanded" ) { 
      return setVisible(true) 
    } else {
      for (const filter of filters || []) {
        if (data.diffs[diffTypes.indexOf(filter)]) {
          return setVisible(true)
        }
      }
      setVisible(false)
    }
  }, [filters, treeview])

  const items = data.children.map((line, i) => (<DiffBlock key={i} data={line} />))

  const tags = data.children.length ? visiable ? ["expanded"] : ["collapsed"] : []

  if (data.tokens.length) {
    if (items.length) {
      return (
        <>
          <DiffLine data={data} tags={tags} onClick={() => setVisible(!visiable)} />
          <StyledDiffNodeItems hidden={!visiable}>{items}</StyledDiffNodeItems>
        </>
      )
    } else {
      return<DiffLine data={data} tags={tags} onClick={() => setVisible(!visiable)} />
    }
  } else {
    return <div>{items}</div>
  }
}
