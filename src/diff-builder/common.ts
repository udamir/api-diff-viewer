import { ActionType, DiffMeta, DiffType } from "api-smart-diff"

export const metaKey = "$diff" //Symbol("diff") // TODO handle "$diff" key in file
export const diffTypes: DiffType[] = ["breaking", "non-breaking", "annotation", "unclassified"]

export type TokenTag = "before" | "after" | "empty" | "collapsed" | "expanded"

export type TokenType = "key" | "index" | "value" | "spec" | DiffType
export type LineDiff = {
  type: DiffType,
  action: ActionType
}

export class Token {
  public tags: TokenTag[]
  public type: TokenType
  public value: string

  constructor(type: TokenType, value: string, tags?: TokenTag[] | TokenTag) {
    this.type = type
    this.value = value
    this.tags = Array.isArray(tags) ? tags : tags ? [tags] : []
  }

  static Key(value: any, tags?: TokenTag | TokenTag[]) {
    return new Token("key", value, tags)
  }

  static Index(value: any, tags?: TokenTag | TokenTag[]) {
    return new Token("index", value, tags)
  }

  static Value(value: any, tags?: TokenTag | TokenTag[]) {
    return new Token("value", value, tags)
  }

  static Spec(value: any, tags?: TokenTag | TokenTag[]) {
    return new Token("spec", value, tags)
  }

  static Change(count: number, changeIndex: number, tags?: TokenTag | TokenTag[]){
    return new Token(diffTypes[changeIndex], String(count), tags)
  }

  public cond(value: TokenTag | TokenTag[], cond = true) {
    if (!cond) { return this }
    this.tags.push(...Array.isArray(value) ? value : [value])
    return this
  }
}


export class DiffLineData {
  public index: number
  public indent: number
  public tokens: Token[]
  public diff?: DiffMeta
  
  constructor(index: number, indent: number, tokens: Token[], diff?: DiffMeta) {
    this.index = index
    this.indent = indent
    this.tokens = tokens
    this.diff = diff
  }
}

export class DiffBlockData extends DiffLineData {
  public id: string
  public children: DiffBlockData[]
  public diffs: number[]

  public level: number

  public lines: number

  public get nextLine() {
    return this.index + this.lines
  }
  
  constructor(index: number, indent: number, tokens: Token[], diff?: DiffMeta, level = 0, id = "") {
    super(index, indent, tokens, diff)
    this.id = id
    this.children = []
    this.diffs = [0, 0, 0, 0]
    this.lines = tokens.length ? 1 : 0
    this.level = level
  }

  public addDiff(diff: DiffMeta) {
    const i = diffTypes.indexOf(diff.type)
    this.diffs[i]++
  }

  public addBlock(block: DiffBlockData) {
    this.lines += block.lines
    this.children.push(block)
    block.diffs.forEach((v, i) => this.diffs[i] += v)
  }
}
