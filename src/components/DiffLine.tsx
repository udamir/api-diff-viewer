import React, { useContext } from "react"

import { DiffLineData } from "../diff-builder/common"
import { DiffContext } from "../helpers/diff.context"
import { Line } from "./Line"

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
  
  return tags.includes("hidden") ? <></> : (
    <div id={`line-${data.index}`} style={{ display: "flex" }} onClick={onClick}>
      {display === "inline" 
        ? ( <Line {...data} tags={["before", "after", ...tags]} /> ) 
        : ([
            <Line key="before" {...data} tags={["before", ...tags]} />,
            <Line key="after" {...data} tags={["after", ...tags]} />,
          ])
      }
    </div>
  )
}
