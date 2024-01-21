import { DiffMeta, DiffAction } from "api-smart-diff"
import { diffWords } from "diff"
import { encodeKey, isEmpty } from "../utils"
import { DiffBlockData, Token, metaKey, TokenTag } from "./common"

export const buildDiffJson = (input: any, parent: DiffBlockData) => {
  if (input instanceof Array) {
    for (let i = 0; i < input.length; i++) {
      buildDiffJsonBlock(input, i, parent, i === input.length - 1)
    }
  } else {
    const keys = Object.keys(input)
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === metaKey) { continue }
      buildDiffJsonBlock(input, keys[i], parent, i === keys.length - 1)
    }
  }
  addJsonBlockTokens(parent)
}

export const addJsonBlockTokens = (block: DiffBlockData) => {
  let added = block.children.length
  let removed = block.children.length

  block.children.forEach((child) => {
    added -= child.diff?.action === "add" ? 1 : 0
    removed -= child.diff?.action === "remove" ? 1 : 0
  })
  
  if (block.tokens.length) {
    const tokens = block.diffs?.map((c, i) => c && Token.Change(c, i, "collapsed")).filter((v) => !!v) as any || []
    block.tokens.push(...tokens)
  }
}

export const _jsonValueTokens = (tokenConstrucor: (value: any, tags?: TokenTag | TokenTag[]) => Token, value: any, diff?: DiffMeta) => {
  const _value = JSON.stringify(value)
  if (diff?.replaced !== undefined && typeof value === "string") {
    const changes = diffWords(_value, JSON.stringify(diff.replaced))
    return changes.map<Token>((c) => tokenConstrucor(c.value).cond("before", !!c.added).cond("after", !!c.removed))
  } else {
    const content: Token[] = []
    if (diff?.replaced !== undefined) {
      content.push(tokenConstrucor(JSON.stringify(diff.replaced), "before"))
    }
    content.push(tokenConstrucor(_value).cond("after", diff?.replaced !== undefined))
    return content
  }
}

export const _jsonPropLineTokens = (key: string | number, value: any, diff?: DiffMeta, last = false) => {
  return [
    ...diff?.action === DiffAction.rename ? _jsonValueTokens(Token.Key, key, diff) : [Token.Key(JSON.stringify(key))],
    Token.Spec(": "),
    ...diff?.action === DiffAction.rename ? [Token.Value(JSON.stringify(value))] : _jsonValueTokens(Token.Value, value, diff),
    ...last ? [] : [Token.Spec(",")],
  ] 
}

export const _jsonArrLineTokens = (value: any, diff?: DiffMeta, last?: boolean) => {
  return [
    ..._jsonValueTokens(Token.Value, value, diff),
    ...last ? [] : [Token.Spec(",")],
  ]
}

export const _jsonPropBlockTokens = (isArray: boolean, key: string | number, diff?: DiffMeta, last = false) => {
  return [
    ...diff?.action === DiffAction.rename ? _jsonValueTokens(Token.Key, key, diff) : [Token.Key(JSON.stringify(key))],
    Token.Spec(": "),
    ...isArray 
      ? [Token.Spec("[", "expanded"), Token.Spec(`[...]${last ? "" : ","}`, "collapsed")]
      : [Token.Spec("{", "expanded"), Token.Spec(`{...}${last ? "" : ","}`, "collapsed")]
  ]
}

export const _jsonBeginBlockTokens = (isArray: boolean, last: boolean) => {
  return [
    ...isArray 
      ? [Token.Spec("[", "expanded"), Token.Spec(`[...]${last ? "" : ","}`, "collapsed")]
      : [Token.Spec("{", "expanded"), Token.Spec(`{...}${last ? "" : ","}`, "collapsed")]
  ]
}

export const _jsonEndBlockTokens = (isArray: boolean, last: boolean) => {
  return [
    ...isArray 
      ? [Token.Spec(`]${last ? "" : ","}`)]
      : [Token.Spec(`}${last ? "" : ","}`)]
  ]
}

export const buildDiffJsonBlock = (input: any, key: string | number, parent: DiffBlockData, last: boolean) => {
  const value = input[key]
  let diff: DiffMeta | undefined = metaKey in input && (input as any)[metaKey][key]

  if (diff) {
    parent.addDiff(diff)
  } else {
    diff = parent.diff?.action !== "rename" ? parent.diff : diff
  }

  const { nextLine, indent } = parent

  let block: DiffBlockData
  if (typeof value !== 'object' || input instanceof Date || isEmpty(value)) {
    const tokens = Array.isArray(input) 
      ? _jsonArrLineTokens(value, diff, last)
      : _jsonPropLineTokens(key, value, diff, last)
  
    block = new DiffBlockData(nextLine, indent + 2, tokens, diff)
  } else {
    block = Array.isArray(input) 
      ? new DiffBlockData(nextLine, indent + 2, _jsonBeginBlockTokens(Array.isArray(value), last), diff)
      : new DiffBlockData(nextLine, indent + 2, _jsonPropBlockTokens(Array.isArray(value), key, diff, last), diff)
      
    const encodedKey = encodeKey(String(key))
    block.id = parent.id ? `${parent.id}/${encodedKey}` : encodedKey

    buildDiffJson(value, block)
    block.addBlock(new DiffBlockData(block.nextLine, indent + 2, _jsonEndBlockTokens(Array.isArray(value), last), diff))
  }

  parent.addBlock(block)
}
