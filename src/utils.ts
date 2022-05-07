import { ApiMergedMeta, DiffType } from "api-smart-diff"
import { DisplayCondition, ParsedBlock, ParsedLine, Token, valueTokens } from "./diffParser"
import { YAML } from "./yaml"

export type BlockType = "object" | "array"
export type TokenType = "key" | "index" | "value" | "spec"
export type ActionType = "add" | "remove" | "replace"
export const diffTypes: DiffType[] = ["breaking", "non-breaking", "annotation", "unclassified"]

export const _added = (type?: DiffType): ApiMergedMeta => ({
  action: "add",
  type: type || "unclassified"
})

export const _removed = (type?: DiffType): ApiMergedMeta => ({
  action: "remove",
  type: type || "unclassified"
})

export const _replaced = (val: string | number, type?: DiffType): ApiMergedMeta => ({
  action: "replace",
  replaced: val,
  type: type || "unclassified"
})

export const isEmpty = (value: any) => {
  return !value || value === '0' || (value instanceof Array && value.length === 0) || (value instanceof Object && !Object.keys(value))
}

export const _yamlPropLine = (index: number, indent: number, key: string, value: any, diff?: ApiMergedMeta) => {
  return new ParsedLine(index, indent, [
    Token.Key(YAML.stringify(key)),
    Token.Spec(": "),
    ...valueTokens(YAML.stringify(value), diff)
  ], diff) 
}

export const _yamlArrItemLine = (index: number, indent: number, value: any, level: number = 1, diff?: ApiMergedMeta) => {
  return new ParsedLine(index, indent, [
    Token.Spec("- ".repeat(level)),
    ...valueTokens(YAML.stringify(value), diff)
  ], diff) 
}

export const _yamlObjPropLine = (index: number, indent: number, key: string, diffs?: number[], diff?: ApiMergedMeta) => {
  return new ParsedLine(index, indent, [
    Token.Key(YAML.stringify(key)),
    Token.Spec(":"),
    Token.Spec(" {}", ["empty", "expanded"]),
    Token.Spec(" {...} ", "collapsed"),
    ...diffs?.map((c, i) => c && Token.Change(c, i, "collapsed")).filter((v) => !!v) as any || []
  ], diff) 
}

export const _yamlArrPropLine = (index: number, indent: number, key: string, diffs?: number[], diff?: ApiMergedMeta) => {
  return new ParsedLine(index, indent, [
    Token.Key(YAML.stringify(key)),
    Token.Spec(":"),
    Token.Spec(" []", ["empty", "expanded"]),
    Token.Spec(" [...] ", "collapsed"),
    ...diffs?.map((c, i) => c && Token.Change(c, i, "collapsed")).filter((v) => !!v) as any || []
  ], diff) 
}

export const _yamlPropBlock = (type: "object" | "array", index: number, indent: number, key: string, properties: (ParsedLine | ParsedBlock)[], diff?: ApiMergedMeta): ParsedBlock => {
  const diffs = [0, 0, 0, 0]

  if (diff) {
    diffs[diffTypes.indexOf(diff?.type)]++
  }

  let lines = 1
  let added = 0
  let removed = 0
  properties.forEach((p) => {
    if (p instanceof ParsedBlock) {
      p.diffs.forEach((v, i) => diffs[i] += v)
      added += p.firstLine.diff?.action === "add" ? 1 : 0
      removed += p.firstLine.diff?.action === "remove" ? 1 : 0
      lines += p.lines
    } else {
      lines++
      if (p.diff?.type) {
        if (diff && diff.action !== "replace") { return }
        diffs[diffTypes.indexOf(p.diff.type)]++
        added += p.diff?.action === "add" ? 1 : 0
        removed += p.diff?.action === "remove" ? 1 : 0
      }
    }
  })

  const emptyTags: DisplayCondition[] = ["expanded"]
  if (diff?.action !== "add" && properties.length && added === properties.length) {
    emptyTags.push("before")
  } else if (diff?.action !== "remove" && properties.length && removed === properties.length) {
    emptyTags.push("after")
  }
  const empty = !properties.length || emptyTags.length > 1

  const line = new ParsedLine(index, indent, [
    Token.Key(YAML.stringify(key)),
    Token.Spec(":"),
    ...empty ? [Token.Spec(" []", emptyTags)] : [], 
    Token.Spec(type === "array" ? " [...] " : " {...} ", "collapsed"),
    ...diffs?.map((c, i) => c && Token.Change(c, i, "collapsed")).filter((v) => !!v) as any || []
  ], diff) 

  return new ParsedBlock(lines, diffs, [line, ...properties])
}


export const _yamlItemBlock = (type: "object" | "array", index: number, indent: number, properties: (ParsedLine | ParsedBlock)[], diff?: ApiMergedMeta): ParsedBlock => {
  const diffs = [0, 0, 0, 0]

  if (diff) {
    diffs[diffTypes.indexOf(diff?.type)]++
  }

  let lines = 1
  let added = 0
  let removed = 0
  properties.forEach((p) => {
    if (p instanceof ParsedBlock) {
      p.diffs.forEach((v, i) => diffs[i] += v)
      added += p.firstLine.diff?.action === "add" ? 1 : 0
      removed += p.firstLine.diff?.action === "remove" ? 1 : 0
      lines += p.lines
    } else {
      lines++
      if (p.diff?.type) {
        if (diff && diff.action !== "replace") { return }
        diffs[diffTypes.indexOf(p.diff.type)]++
        added += p.diff?.action === "add" ? 1 : 0
        removed += p.diff?.action === "remove" ? 1 : 0
      }
    }
  })

  const emptyTags: DisplayCondition[] = ["expanded"]
  if (diff?.action !== "add" && properties.length && added === properties.length) {
    emptyTags.push("before")
  } else if (diff?.action !== "remove" && properties.length && removed === properties.length) {
    emptyTags.push("after")
  }
  const empty = !properties.length || emptyTags.length > 1

  if (properties[0] instanceof ParsedLine && !properties[0].diff) {
    const line = new ParsedLine(index, indent, [
      Token.Spec("- "),
      ...properties[0].tokens.map((token) => ({ ...token, display: [...token.display, "expanded"]}) ),
      ...empty ? [Token.Spec(" []", emptyTags)] : [], 
      Token.Spec(type === "array" ? " [...] " : " {...} ", "collapsed"),
      ...diffs?.map((c, i) => c && Token.Change(c, i, "collapsed")).filter((v) => !!v) as any || []
    ], diff) 
    return new ParsedBlock(lines, diffs, [line, ...properties.slice(1)])
  } else {
    const line = new ParsedLine(index, indent, [
      Token.Spec("- "),
      ...empty ? [Token.Spec(" []", emptyTags)] : [], 
      Token.Spec(type === "array" ? " [...] " : " {...} ", "collapsed"),
      ...diffs?.map((c, i) => c && Token.Change(c, i, "collapsed")).filter((v) => !!v) as any || []
    ], diff) 
    return new ParsedBlock(lines, diffs, [line, ...properties])
  }

}
