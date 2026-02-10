import { type DiffMeta, DiffAction } from "api-smart-diff"
import { DiffBlockData, Token, TokenTag } from "./common"
import type { FormatStrategy, FormatContext } from "./builder"
import { valueTokens } from "./builder"
import { YAML } from "../utils/yaml"
import type { JsonValue } from "../types"

export const yamlStrategy: FormatStrategy = {
  stringify: YAML.stringify,

  propLineTokens(key: string | number, value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext) {
    return [
      Token.Spec("- ".repeat(ctx.level)),
      ...diff?.action === DiffAction.rename
        ? valueTokens(YAML.stringify, Token.Key, key, diff)
        : [Token.Key(YAML.stringify(key))],
      Token.Spec(": "),
      ...diff?.action === DiffAction.rename
        ? [Token.Value(YAML.stringify(value))]
        : valueTokens(YAML.stringify, Token.Value, value, diff),
    ]
  },

  arrLineTokens(value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext) {
    return [
      Token.Spec("- ".repeat(ctx.level + 1)),
      ...valueTokens(YAML.stringify, Token.Value, value, diff),
    ]
  },

  propBlockTokens(isArray: boolean, key: string | number, diff: DiffMeta | undefined, ctx: FormatContext) {
    return [
      Token.Spec("- ".repeat(ctx.level)),
      ...diff?.action === DiffAction.rename
        ? valueTokens(YAML.stringify, Token.Key, key, diff)
        : [Token.Key(YAML.stringify(key))],
      Token.Spec(":"),
      ...isArray
        ? [Token.Spec(" [...] ", "collapsed")]
        : [Token.Spec(" {...} ", "collapsed")],
    ]
  },

  beginBlockTokens() {
    return []
  },

  endBlockTokens() {
    return []
  },

  addBlockTokens(block: DiffBlockData, isArray: boolean) {
    let added = block.children.length
    let removed = block.children.length

    block.children.forEach((child) => {
      added -= child.diff?.action === "add" ? 1 : 0
      removed -= child.diff?.action === "remove" ? 1 : 0
    })

    const tags: TokenTag[] = [
      "expanded",
      ...!added && block.diff?.action !== "add" ? ["before" as TokenTag] : [],
      ...!removed && block.diff?.action !== "remove" ? ["after" as TokenTag] : [],
    ]

    if (block.tokens.length) {
      if (tags.length > 1) {
        block.tokens.push(Token.Spec(isArray ? " []" : " {}", tags))
      }
      const tokens = block.diffs
        ?.map((c, i) => c && Token.Change(c, i, "collapsed"))
        .filter((v) => !!v) as Token[] || []
      block.tokens.push(...tokens)
    }
  },

  postAddBlock(parent: DiffBlockData, _block: DiffBlockData, ctx: FormatContext) {
    parent.indent += ctx.level * 2
    ctx.level = 0
  },

  createArrayContainerBlock(parent: DiffBlockData, _isArrayValue: boolean, diff: DiffMeta | undefined, ctx: FormatContext) {
    return {
      block: new DiffBlockData(parent.nextLine, parent.indent, [], diff),
      childLevel: ctx.level + 1,
    }
  },
}
