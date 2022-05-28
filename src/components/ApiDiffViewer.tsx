/// <reference lib="dom" />

import React, { useEffect, useState } from "react"
import { ApiDiffOptions, BaseRulesType, DiffType } from "api-smart-diff"
import styled from "styled-components"

import { DiffBlockData, metaKey } from "../diff-builder/common"
import { DiffContext } from "../helpers/diff.context"
import { ApiNavigation } from "./ApiNavigation"
import { buildDiffBlock } from "../diff-builder"
import { DiffBlock } from "./DiffBlock"
import { SideBar } from "./SideBar"

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
  rules?: BaseRulesType
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
  /**
   * Show navigation sidebar
   */
  navigation?: boolean
}

const StyledLayout = styled.div`
  display: flex;
  flex-direction: row;
`

export const merge = (before: any, after: any, options: ApiDiffOptions): Promise<DiffBlockData> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event) => {
      worker.terminate()
      resolve(event.data)
    }
    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }
    worker.postMessage([before, after, options])
  })
}


export const ApiDiffViewer = ({ before, after, rules = "JsonSchema", display = "side-by-side", format="yaml", treeview="expanded", filters=[], navigation = false }: DiffTreeProps) => {

  const [data, setData] = useState<DiffBlockData>()
  const [error, setError] = useState("")
    
  useEffect(() => {
    const buildBlock = async () => {
      const block = await merge(before, after, { rules, metaKey, arrayMeta: true })
      setData(block);
    }
    buildBlock()
      .catch(setError);
  }, [before, after, rules, format])

  const block = buildDiffBlock(data, format)
  const [selected, setSelected] = useState("")

  const navigate = (id: string) => {
    setSelected(id)
    const block = document.getElementById(id)!
    if (!block) { return }
    const y = block.getBoundingClientRect().top + window.pageYOffset - 150;
    window.scrollTo({top: y, behavior: 'smooth'});
  }

  return (
    <DiffContext.Provider value={{ treeview, filters, display, selected, navigate }}>
      <div id="api-diff-viewer">
        <StyledLayout>
          { navigation && <SideBar><ApiNavigation data={data} diffMetaKey={metaKey} navigate={navigate} /></SideBar> }
          { data ? <DiffBlock data={block} /> : <div>Processing...</div> }
          { error && <div>Error: {error}</div> }
        </StyledLayout>
      </div>
    </DiffContext.Provider>
  )
}
