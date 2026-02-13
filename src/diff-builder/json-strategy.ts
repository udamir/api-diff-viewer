import { type DiffBlockData, Token } from "./common"
import { type DiffMeta, DiffAction } from "api-smart-diff"
import type { FormatStrategy, FormatContext } from "./builder"
import type { JsonValue } from "../types"
import { valueTokens } from "./builder"

export const jsonStrategy: FormatStrategy = {
  stringify: JSON.stringify,

  propLineTokens(key: string | number, value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext) {
    return [
      ...diff?.action === DiffAction.rename
        ? valueTokens(JSON.stringify, Token.Key, key, diff, ctx.skipWordDiff)
        : [Token.Key(JSON.stringify(key))],
      Token.Spec(": "),
      ...diff?.action === DiffAction.rename
        ? [Token.Value(JSON.stringify(value))]
        : valueTokens(JSON.stringify, Token.Value, value, diff, ctx.skipWordDiff),
      ...ctx.last ? [] : [Token.Spec(",")],
    ]
  },

  arrLineTokens(value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext) {
    return [
      ...valueTokens(JSON.stringify, Token.Value, value, diff, ctx.skipWordDiff),
      ...ctx.last ? [] : [Token.Spec(",")],
    ]
  },

  propBlockTokens(isArray: boolean, key: string | number, diff: DiffMeta | undefined, ctx: FormatContext) {
    return [
      ...diff?.action === DiffAction.rename
        ? valueTokens(JSON.stringify, Token.Key, key, diff, ctx.skipWordDiff)
        : [Token.Key(JSON.stringify(key))],
      Token.Spec(": "),
      ...isArray
        ? [Token.Spec("[", "expanded"), Token.Spec(`[...]${ctx.last ? "" : ","}`, "collapsed")]
        : [Token.Spec("{", "expanded"), Token.Spec(`{...}${ctx.last ? "" : ","}`, "collapsed")],
    ]
  },

  beginBlockTokens(isArray: boolean, ctx: FormatContext) {
    return [
      ...isArray
        ? [Token.Spec("[", "expanded"), Token.Spec(`[...]${ctx.last ? "" : ","}`, "collapsed")]
        : [Token.Spec("{", "expanded"), Token.Spec(`{...}${ctx.last ? "" : ","}`, "collapsed")],
    ]
  },

  endBlockTokens(isArray: boolean, ctx: FormatContext) {
    return [
      ...isArray
        ? [Token.Spec(`]${ctx.last ? "" : ","}`)]
        : [Token.Spec(`}${ctx.last ? "" : ","}`)],
    ]
  },

  addBlockTokens(block: DiffBlockData) {
    if (block.tokens.length) {
      const tokens = block.diffs
        ?.map((c, i) => c && Token.Change(c, i, "collapsed"))
        .filter((v) => !!v) as Token[] || []
      block.tokens.push(...tokens)
    }
  },
}
