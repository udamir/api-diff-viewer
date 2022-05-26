/// <reference types="vite-plugin-comlink/client" />

import React, { useEffect, useState } from "react"
import { DiffType } from "api-smart-diff"

import { DiffBlock } from "./DiffBlock"
import { DiffContext } from "../helpers/context"
import { buildDiffBlock } from "../diff-builder"
import { DiffBlockData } from "../diff-builder/common"

export interface DiffTreeProps {
  /**
   * object before
   */
  before: any
  /**
   * object after
   */
  after: any
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
  /**
   * Api compare rules
   */
  rules?: "OpenApi3" | "AsyncApi2" | "JsonSchema"
  /**
   * Output format
   */
  format?: "json" | "yaml"
  /**
   * Treeview parameters
   */
  treeview?: "expanded" | "collapsed" | "filtered"
  /**
   * Change filters for filtered treeview
   */
  filters?: DiffType[]
}

export const ApiDiffViewer = ({ before, after, rules = "JsonSchema", display = "side-by-side", format="yaml", treeview="expanded", filters=[] }: DiffTreeProps) => {
  const [data, setData] = useState<DiffBlockData>()
  const [error, setError] = useState("")
    
  useEffect(() => {
    const buildBlock = async () => {
      const block = await buildDiffBlock(before, after, rules, format)
      setData(block);
    }
    buildBlock()
      .catch(setError);
  }, [before, after, rules, format])

  return (
    <DiffContext.Provider value={{ treeview, filters, display }}>
      <div id="api-diff-viewer">
        { data ? <DiffBlock data={data} /> : <span>Loading...</span>}
        { error && <span>{error}</span>}
      </div>
    </DiffContext.Provider>
  )
}
