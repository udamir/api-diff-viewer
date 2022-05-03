import { diffWords } from "diff"

export type BlockType = "object" | "array"
export type TokenType = "key" | "index" | "value" | "spec"
export type ActionType = "add" | "remove" | "replace"

export type Token = {
  type: TokenType
  value: string
  display?: "before" | "after"
}

export type LineData = {
  type: "objectBlock" | "arrayBlock" | "line"
  line: number
  lines?: number
  indent: number
  prefix?: string
  tokens: Token[]
  children?: LineData[]
  action?: ActionType
  diffType?: string
  diffs?: number[]
}

export type Diff = {
  action: ActionType
  replaced?: any
  type?: any
}

const _token = (type: TokenType, value: any, display?: "before" | "after"): Token => ({
  type,
  value,
  ...(display ? { display } : {}),
})

const countDiffs = (diff?: Diff): number[] => {
  const diffs = [0,0,0,0,0]
  if (!diff) { return diffs }
  const i = ["","breaking", "non-breaking", "annotation", "unclassified"].indexOf(diff.type)
  diffs[0]++
  diffs[i]++
  return diffs
}

export const _block = (type: BlockType, line: number, indent: number, key: string, children: LineData[], diff?: Diff): LineData => {
  let lines = 1
  let removed = 0
  let diffs = countDiffs(diff)
  children.forEach((child) => {
    lines += child.lines || 1
    removed += child.action === "remove" ? 1 : 0
    if (diff && diff.action === "replace") {
      diffs = child.diffs?.map((v,i) => v + diffs[i]) || diffs
    }
  })

  const emptyBlock =
    removed === children.length && diff?.action !== "remove"
      ? [
          _token("spec", " "),
          _token("spec", type === "object" ? "{}" : "[]", diff && diff.action !== "add" ? "after" : undefined),
        ]
      : []

  return {
    type: type === "object" ? "objectBlock" : "arrayBlock",
    indent,
    line,
    children,
    lines,
    diffs,
    ...(diff ? { action: diff.action, diffType: diff.type } : {}),
    tokens: [_token("key", key), _token("spec", ":"), ...emptyBlock],
  }
}

const lineTokens = (value: any, diff?: Diff) => {

  if (diff?.replaced !== undefined && typeof value === "string") {
    const changes = diffWords(String(value), String(diff.replaced))
    return changes.map<Token>((c) => _token("value", c.value, c.added && "before" || c.removed && "after" || undefined ))
  } else {
    const content: Token[] = []
    if (diff?.replaced !== undefined) {
      content.push(_token("value", String(diff.replaced), "before"))
    }
    content.push(_token("value", value, diff?.replaced !== undefined && "after" || undefined))
    return content
  }
}

export const _arrLine = (line: number, indent: number, value: any, diff?: Diff): LineData => {

  return {
    type: "line",
    indent,
    line,
    prefix: "- ",
    ...(diff ? { action: diff.action, diffs: countDiffs(diff), diffType: diff.type } : {}),
    tokens: [
      _token("index", "- "),
      ...lineTokens(value, diff),
    ]
  }
}

export const _arrBlock = (type: BlockType, line: number, indent: number, children: LineData[], diff?: Diff): LineData => {
  const first = children[0]
  let lines = first && !first.action ? 0 : 1
  let removed = 0
  let diffs = countDiffs(diff)
  children.forEach((child) => {
    lines += child.lines || 1
    removed += child.action === "remove" ? 1 : 0
    if (diff && diff.action === "replace") {
      diffs = child.diffs?.map((v,i) => v + diffs[i]) || diffs
    }
  })
  const emptyBlock =
    removed === children.length && diff?.action !== "remove"
      ? [
          _token("spec", " "),
          _token("spec", type === "object" ? "{}" : "[]", diff && diff.action !== "add" ? "after" : undefined),
        ]
      : []

  return {
    type: type === "object" ? "objectBlock" : "arrayBlock",
    indent,
    line,
    lines,
    diffs,
    prefix: "- ",
    ...(diff ? { action: diff.action, diffType: diff.type } : {}),
    tokens: [
      _token("index", "- "),
      ...(first && !first.action && first.type === "line" ? first.tokens : emptyBlock),
      ...(diff?.replaced !== undefined ? [_token("value", String(diff.replaced), "before")] : []),
    ],
    children: first && !first.action && first.type === "line" ? children.slice(1) : children,
  }
}

export const _line = (line: number, indent: number, key: string, value: any, diff?: Diff): LineData => ({
  type: "line",
  indent,
  line,
  ...(diff ? { action: diff.action, diffs: countDiffs(diff), diffType: diff.type } : {}),
  tokens: [
    _token("key", key),
    _token("spec", ": "),
    ...lineTokens(value, diff)
  ],
})

export const _added: Diff = {
  action: "add",
}

export const _removed: Diff = {
  action: "remove",
}

export const _replaced = (val: string | number): Diff => ({
  action: "replace",
  replaced: val,
})
