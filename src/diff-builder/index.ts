import { DiffBlockData } from "./common"
import { buildDiffJson } from "./json-builder"
import { buildDiffYaml } from "./yaml-builder"

export const buildDiffBlock = (data: any, format: "json" | "yaml" = "yaml") => {
  const block = new DiffBlockData(1, -2, [])
  const buildDiff = format === "json" ? buildDiffJson : buildDiffYaml
  buildDiff(data, block)
  return block
}

export const buildDiffBlockLines = (data: any, format: "json" | "yaml" = "yaml") => {
  const block = new DiffBlockData(1, -2, [])
  const buildDiff = format === "json" ? buildDiffJson : buildDiffYaml
  buildDiff(data, block)
  const lines = buildDiffLines(block)
  return lines
}

const buildDiffLines = (block: DiffBlockData): DiffBlockData[] => {
  const lines = []
  if (block.tokens.length) {
    lines.push(block)
  }
  for (const child of block.children) {
    lines.push(...buildDiffLines(child))
  }
  return lines
}
