import { DiffMeta, DiffAction } from "api-smart-diff"
import { diffWords } from "diff"
import { YAML } from "../helpers/yaml"
import { encodeKey, isEmpty } from "../utils"
import { DiffBlockData, Token, TokenTag, metaKey } from "./common"

export const buildDiffYaml = (input: any, parent: DiffBlockData) => {
  if (input instanceof Array) {
    for (let i = 0; i < input.length; i++) {
      buildDiffYamlBlock(input, i, parent)
    }
  } else {
    for (const key in input) {
      if (key === metaKey) { continue }
      buildDiffYamlBlock(input, key, parent)
    }
  }
  addYamlBlockTokens(parent, input instanceof Array)
}

export const addYamlBlockTokens = (block: DiffBlockData, arrayBlock: boolean) => {
  let added = block.children.length
  let removed = block.children.length

  block.children.forEach((child) => {
    added -= child.diff?.action === "add" ? 1 : 0
    removed -= child.diff?.action === "remove" ? 1 : 0
  })

  const tags = [
    "expanded",
    ...!added && block.diff?.action !== "add" ? ["before"] : [],
    ...!removed && block.diff?.action !== "remove" ? ["after"] : [],
  ]
  
  if (block.tokens.length) {
    if (tags.length > 1) {
      block.tokens.push(Token.Spec(arrayBlock ? " []" : " {}", tags as TokenTag[]))
    }
    const tokens = block.diffs?.map((c, i) => c && Token.Change(c, i, "collapsed")).filter((v) => !!v) as any || []
    block.tokens.push(...tokens)
  }
}

export const _yamlValueTokens = (tokenConstrucor: (value: any, tags?: TokenTag | TokenTag[]) => Token, value: any, diff?: DiffMeta) => {
  const _value = YAML.stringify(value)
  if (diff?.replaced !== undefined && typeof value === "string") {
    const changes = diffWords(_value, YAML.stringify(diff.replaced))
    return changes.map<Token>((c) => tokenConstrucor(c.value).cond("before", !!c.added).cond("after", !!c.removed))
  } else {
    const content: Token[] = []
    if (diff?.replaced !== undefined) {
      content.push(tokenConstrucor(YAML.stringify(diff.replaced), "before"))
    }
    content.push(tokenConstrucor(_value).cond("after", diff?.replaced !== undefined))
    return content
  }
}

export const _yamlPropLineTokens = (key: string | number, value: any, diff?: DiffMeta, level: number = 0) => {
  return [
    Token.Spec("- ".repeat(level)),
    ...diff?.action === DiffAction.rename ? _yamlValueTokens(Token.Key, key, diff) : [Token.Key(YAML.stringify(key))],
    Token.Spec(": "),
    ...diff?.action === DiffAction.rename ? [Token.Value(YAML.stringify(value))] : _yamlValueTokens(Token.Value, value, diff)
  ] 
}

export const _yamlArrLineTokens = (value: any, diff?: DiffMeta, level: number = 0) => {
  return [
    Token.Spec("- ".repeat(level + 1)),
    ..._yamlValueTokens(Token.Value, value, diff)
  ]
}

export const _yamlPropBlockTokens = (isArray: boolean, key: string | number, diff?: DiffMeta, level: number = 0) => {
  return [
    Token.Spec("- ".repeat(level)),
    ...diff?.action === DiffAction.rename ? _yamlValueTokens(Token.Key, key, diff) : [Token.Key(YAML.stringify(key))],
    Token.Spec(":"),
    ...isArray 
      ? [Token.Spec(" [...] ", "collapsed")]
      : [Token.Spec(" {...} ", "collapsed")]
  ]
}

export const buildDiffYamlBlock = (input: any, key: string | number, parent: DiffBlockData) => {
  const value = input[key]
  const { [metaKey]: meta, ...rest } = input
  let diff: DiffMeta | undefined = meta && meta[key]

  if (diff) {
    parent.addDiff(diff)
  } else {
    diff = parent.diff?.action !== "rename" ? parent.diff : diff
  }

  const { nextLine, indent, level } = parent

  let block: DiffBlockData
  if (typeof value !== 'object' || input instanceof Date || isEmpty(value)) {
    const tokens = Array.isArray(input) 
      ? _yamlArrLineTokens(value, diff, level)
      : _yamlPropLineTokens(key, value, diff, level)
  
    block = new DiffBlockData(nextLine, indent + 2, tokens, diff)
  } else {
    const tokens = _yamlPropBlockTokens(Array.isArray(value), key, diff, level)

    block = Array.isArray(input) 
      ? new DiffBlockData(nextLine, indent, [], diff, level + 1)
      : new DiffBlockData(nextLine, indent + 2, tokens, diff)

    const encodedKey = encodeKey(String(key))
    block.id = parent.id ? `${parent.id}/${encodedKey}` : encodedKey
    
    buildDiffYaml(value, block)
  }

  parent.addBlock(block)
  parent.indent += parent.level * 2
  parent.level = 0
}
