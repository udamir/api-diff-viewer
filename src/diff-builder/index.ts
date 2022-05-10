import { apiMerge, BaseRulesType } from "api-smart-diff"
import { DiffBlockData, metaKey } from "./common"
import { buildDiffJson } from "./json-builder"
import { buildDiffYaml } from "./yaml-builder"

export class DiffBuilder {
  public source: any

  constructor(before: any, after: any, rules: BaseRulesType) {
    this.source = apiMerge(before, after, { rules, metaKey, arrayMeta: true })
  }

  public buildJson() {
    const block = new DiffBlockData(1, 0, [])
    buildDiffJson(this.source, block)
    return block
  }

  public buildYaml() {
    const block = new DiffBlockData(1, 0, [])
    buildDiffYaml(this.source, block)
    return block
  }
}
