import { DiffBlockData } from "./common"
import { buildDiff } from "./builder"
import { jsonStrategy } from "./json-strategy"
import { yamlStrategy } from "./yaml-strategy"
import type { MergedDocument } from "../types"

export interface BuildDiffBlockOptions {
  /** When true, skip diffWords() in token generation. Used for large documents. */
  skipWordDiff?: boolean
}

export const buildDiffBlock = (data: MergedDocument, format: "json" | "yaml" = "yaml", options?: BuildDiffBlockOptions) => {
  const block = new DiffBlockData(1, -2, [])
  const strategy = format === "json" ? jsonStrategy : yamlStrategy
  buildDiff(data, block, strategy, { last: false, level: 0, skipWordDiff: options?.skipWordDiff })
  return block
}
