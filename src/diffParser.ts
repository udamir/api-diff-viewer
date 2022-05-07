import { apiMerge, BaseRulesType, DiffType, ApiMergedMeta } from "api-smart-diff"
import { diffWords } from "diff"
import { diffTypes, isEmpty, _yamlArrItemLine, _yamlItemBlock, _yamlPropBlock, _yamlPropLine } from "./utils"
import { YAML } from "./yaml"

export type DisplayCondition = "before" | "after" | "empty" | "collapsed" | "expanded"

export type TokenType = "key" | "index" | "value" | "spec" | DiffType

export class Token {
  public display: DisplayCondition[]
  public type: TokenType
  public value: string

  constructor(type: TokenType, value: string, display?: DisplayCondition[] | DisplayCondition) {
    this.type = type
    this.value = value
    this.display = Array.isArray(display) ? display : display ? [display] : []
  }

  static Key(value: any, display?: DisplayCondition | DisplayCondition[]) {
    return new Token("key", value, display)
  }

  static Index(value: any, display?: DisplayCondition | DisplayCondition[]) {
    return new Token("index", value, display)
  }

  static Value(value: any, display?: DisplayCondition | DisplayCondition[]) {
    return new Token("value", value, display)
  }

  static Spec(value: any, display?: DisplayCondition | DisplayCondition[]) {
    return new Token("spec", value, display)
  }

  static Change(count: number, changeIndex: number, display?: DisplayCondition | DisplayCondition[]){
    return new Token(diffTypes[changeIndex], String(count), display)
  }

  public cond(cond: boolean, value: DisplayCondition) {
    if (!cond) { return this }
    this.display.push(value)
    return this
  }
}

export class ParsedLine {
  public index: number
  public indent: number
  public tokens: Token[]
  public diff?: ApiMergedMeta

  constructor(index: number, indent: number, tokens: Token[], diff?: ApiMergedMeta) {
    this.index = index
    this.indent = indent
    this.tokens = tokens || []
    this.diff = diff
  }

  public dump(conditions: DisplayCondition[] | DisplayCondition): ParsedLine {
    conditions = Array.isArray(conditions) ? conditions : [conditions]

    const tokens = this.tokens.filter(({ display }) =>
      Array.isArray(display) 
        ? display.find((c) => conditions.includes(c)) 
        : !display || conditions.includes(display))

    return { ...this, tokens }
  }
}

export const valueTokens = (value: any, diff?: ApiMergedMeta) => {

  if (diff?.replaced !== undefined && typeof value === "string") {
    const changes = diffWords(String(value), String(diff.replaced))
    return changes.map<Token>((c) => Token.Value(c.value).cond(!!c.added, "before").cond(!!c.removed, "after"))
  } else {
    const content: Token[] = []
    if (diff?.replaced !== undefined) {
      content.push(Token.Value(String(diff.replaced), "before"))
    }
    content.push(Token.Value(value).cond(diff?.replaced !== undefined, "after"))
    return content
  }
}

export class ParsedBlock {
  public lines: number
  public diffs: number[]
  public items: (ParsedLine | ParsedBlock)[]
  
  public get firstLine(): ParsedLine {
    return this.items[0] instanceof ParsedBlock ? this.items[0].firstLine : this.items[0]
  }

  constructor(lines: number, diffs: number[], items: (ParsedLine | ParsedBlock)[]) {
    this.items = items
    this.lines = lines
    this.diffs = diffs
  }
}

const metaKey = Symbol("diff")

export class DiffParser {
  public source: any

  constructor(before: any, after: any, rules: BaseRulesType) {
    this.source = apiMerge(before, after, { rules, metaKey, arrayMeta: true })
  }

  public toJsonLines() {
    return this.parseYaml(this.source)
  }

  public toYamlLines() {
    return this.parseYaml(this.source)
  }

  private parseYaml(input: any, line = 1, indent = 0, parentDiff?: ApiMergedMeta) {
    const lines: (ParsedBlock | ParsedLine)[] = []
    if (input instanceof Array) {
      for (let i = 0; i < input.length; i++) {
        const value = input[i]
        const diff: ApiMergedMeta | undefined = metaKey in input && (input as any)[metaKey][i] || parentDiff
        if (diff?.replaced !== undefined) {
          diff.replaced = YAML.stringify(diff.replaced)
        }
        if (typeof value !== 'object' || input instanceof Date || isEmpty(value)) {
          lines.push(_yamlArrItemLine(line++, indent, value, 1, diff))

        } else {
          const children = this.parseYaml(value, line + 1, indent + 2, diff?.action !== "replace" && diff || undefined)
          
          const node = _yamlItemBlock(Array.isArray(value) ? "array" : "object", line, indent, children, diff)
          lines.push(node)
          line += node.lines || 1
        }
      }
    } else {
      for (const key in input) {
        const value = input[key];
        const diff = metaKey in input && input[metaKey][key] || parentDiff
        if (diff?.replaced !== undefined) {
          diff.replaced = YAML.stringify(diff.replaced)
        }
        if (typeof value !== 'object' || input instanceof Date || isEmpty(value)) {
          lines.push(_yamlPropLine(line++, indent, key, value, diff))
        } else {
          const children = this.parseYaml(value, line + 1, indent + 2, diff?.action !== "replace" && diff || undefined)
          
          const node = _yamlPropBlock(Array.isArray(value) ? "array" : "object", line, indent, key, children, diff)
          lines.push(node)
          line += node.lines || 1
        }
      }
    }
    return lines
  }
  
} 
