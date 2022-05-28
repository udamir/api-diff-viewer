import { DiffBlockData } from "./common"
import { buildDiffJson } from "./json-builder"
import { buildDiffYaml } from "./yaml-builder"

export const buildDiffBlock = (data: any, format: "json" | "yaml" = "yaml") => {
  const block = new DiffBlockData(1, -2, [])
  const buildDiff = format === "json" ? buildDiffJson : buildDiffYaml
  buildDiff(data, block)
  return block
}
