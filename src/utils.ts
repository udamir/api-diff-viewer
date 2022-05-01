export type BlockType = "object" | "array"
export type TokenType = "key" | "index" | "value" | "spec"
export type ActionType = "add" | "remove" | "replace"

export type Token = {
  type: TokenType
  value: string | number
  display?: "before" | "after"
}

export type LineData = {
  type: "block" | "line"
  line: number
  lines?: number
  indent: number
  prefix?: string
  tokens: Token[]
  children?: LineData[]
  action?: ActionType
}

export type Diff = {
  action: ActionType
  replaced?: any
  type?: any
}

const _token = (type: TokenType, value: string | number, display?: "before" | "after"): Token => ({
  type,
  value,
  ...(display ? { display } : {}),
})

export const _block = (type: BlockType, line: number, indent: number, key: string, children: LineData[], diff?: Diff): LineData => {
  let lines = 1
  let removed = 0
  children.forEach((child) => {
    lines += child.lines || 1
    removed += child.action === "remove" ? 1 : 0
  })

  const emptyBlock =
    removed === children.length && diff?.action !== "remove"
      ? [
          _token("spec", " "),
          _token("spec", type === "object" ? "{}" : "[]", diff && diff.action !== "add" ? "after" : undefined),
        ]
      : []

  return {
    type: "block",
    indent,
    line,
    children,
    lines,
    ...(diff ? { action: diff.action } : {}),
    tokens: [_token("key", key), _token("spec", ":"), ...emptyBlock],
  }
}

export const _arrLine = (line: number, indent: number, value: string | number, diff?: Diff): LineData => ({
  type: "line",
  indent,
  line,
  prefix: "- ",
  ...(diff ? { action: diff.action } : {}),
  tokens: [
    _token("index", "- "),
    ...(diff?.replaced ? [_token("value", diff.replaced, "before")] : []),
    _token("value", value, diff?.replaced && "after"),
  ],
})

export const _arrBlock = (type: BlockType, line: number, indent: number, children: LineData[], diff?: Diff): LineData => {
  const first = children[0]
  let lines = first && !first.action ? 0 : 1
  let removed = 0
  children.forEach((child) => {
    lines += child.lines || 1
    removed += child.action === "remove" ? 1 : 0
  })
  const emptyBlock =
    removed === children.length && diff?.action !== "remove"
      ? [
          _token("spec", " "),
          _token("spec", type === "object" ? "{}" : "[]", diff && diff.action !== "add" ? "after" : undefined),
        ]
      : []

  return {
    type: "block",
    indent,
    line,
    lines,
    prefix: "- ",
    ...(diff ? { action: diff.action } : {}),
    tokens: [
      _token("index", "- "),
      ...(first && !first.action ? first.tokens : emptyBlock),
      ...(diff?.replaced ? [_token("value", diff.replaced, "before")] : []),
    ],
    children: first && !first.action ? children.slice(1) : children,
  }
}

export const _line = (line: number, indent: number, key: string, value: string | number, diff?: Diff): LineData => ({
  type: "line",
  indent,
  line,
  ...(diff ? { action: diff.action } : {}),
  tokens: [
    _token("key", key),
    _token("spec", ": "),
    ...(diff?.replaced ? [_token("value", diff.replaced, "before")] : []),
    _token("value", value, diff?.replaced && "after"),
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
