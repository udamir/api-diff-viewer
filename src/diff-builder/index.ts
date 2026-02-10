import { DiffBlockData } from "./common"
import { buildDiff } from "./builder"
import { jsonStrategy } from "./json-strategy"
import { yamlStrategy } from "./yaml-strategy"
import type { MergedDocument } from "../types"

export const buildDiffBlock = (data: MergedDocument, format: "json" | "yaml" = "yaml") => {
  const block = new DiffBlockData(1, -2, [])
  const strategy = format === "json" ? jsonStrategy : yamlStrategy
  buildDiff(data, block, strategy)
  return block
}
