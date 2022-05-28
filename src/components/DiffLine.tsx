import React, { useContext } from "react"
import styled from "styled-components"

import { DiffLineData } from "../diff-builder/common"
import { DiffContext } from "../helpers/diff.context"
import { Line } from "./Line"

const StyledDiffLine = styled.div<{ hidden: boolean }>`
  display: ${ ({ hidden }) => hidden ? 'none' : 'flex'};
`

export interface DiffLineProps {
  /**
   * Line data
   */
  data: DiffLineData
  /**
   * Show block expanded or collapsed
   */
  tags?: string[]
  onClick?: () => any
}

export const DiffLine = ({ data, tags = [], onClick }: DiffLineProps) => {
  const { display } = useContext(DiffContext)
  return (
    <StyledDiffLine id={`line-${data.index}`} hidden={tags.includes("hidden")} onClick={onClick}>
      {display === "inline" 
        ? ( <Line {...data} tags={["before", "after", ...tags]} /> ) 
        : ([
            <Line key="before" {...data} tags={["before", ...tags]} />,
            <Line key="after" {...data} tags={["after", ...tags]} />,
          ])
      }
    </StyledDiffLine>
  )
}
