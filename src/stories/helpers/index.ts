import { DiffMeta, DiffType } from "api-smart-diff"

import { DiffBlockData } from "../../diff-builder/common"
import { _yamlArrLineTokens, _yamlPropBlockTokens, _yamlPropLineTokens, addYamlBlockTokens } from "../../diff-builder/yaml-builder"

export const _added = (type?: DiffType): DiffMeta => ({
  action: "add",
  type: type || "unclassified",
})

export const _removed = (type?: DiffType): DiffMeta => ({
  action: "remove",
  type: type || "unclassified",
})

export const _replaced = (val: string | number, type?: DiffType): DiffMeta => ({
  action: "replace",
  replaced: val,
  type: type || "unclassified",
})

export const _yamlPropLine = (i: number, n: number, k: string, v: any, d?: DiffMeta, l = 0) =>
  new DiffBlockData(i, n, _yamlPropLineTokens(k, v, d, l), d)
export const _yamlPropBlock = (i: number, n: number, t: "object" | "array", k: string, c?: DiffBlockData[], d?: DiffMeta, diffs?: number[], l = 0) => {
  const tokens = k ? _yamlPropBlockTokens(t === "array", k, d, l) : []
  const block = new DiffBlockData(i, n, tokens, d)
  block.children = c || []
  if (diffs) {
    block.diffs = diffs
  }
  addYamlBlockTokens(block, t === "array")
  return block
}
export const _yamlArrLine = (i: number, n: number, v: any, d?: DiffMeta, l = 0) => 
  new DiffBlockData(i, n, _yamlArrLineTokens(v, d, l), d)