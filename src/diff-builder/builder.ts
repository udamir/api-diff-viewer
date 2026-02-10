import type { DiffMeta } from "api-smart-diff"
import { diffWords } from "diff"
import { encodeKey, isEmpty } from "../utils/common"
import { DiffBlockData, Token, metaKey, TokenTag } from "./common"
import type { JsonValue } from "../types"

/** Format-specific context passed through the traversal. Mutable within a sibling iteration. */
export interface FormatContext {
  last: boolean
  level: number
}

/** Strategy interface for format-specific token generation */
export interface FormatStrategy {
  stringify(value: JsonValue): string
  propLineTokens(key: string | number, value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext): Token[]
  arrLineTokens(value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext): Token[]
  propBlockTokens(isArray: boolean, key: string | number, diff: DiffMeta | undefined, ctx: FormatContext): Token[]
  beginBlockTokens(isArray: boolean, ctx: FormatContext): Token[]
  endBlockTokens(isArray: boolean, ctx: FormatContext): Token[]
  addBlockTokens(block: DiffBlockData, isArray: boolean): void
  /** Called after each child block is added. May mutate ctx (e.g. YAML resets level). */
  postAddBlock?(parent: DiffBlockData, block: DiffBlockData, ctx: FormatContext): void
  /**
   * Create a container block for an array item that is itself an object/array.
   * Returns the block and the level to use when recursing into its children.
   * If not provided, the default beginBlockTokens path is used.
   */
  createArrayContainerBlock?(parent: DiffBlockData, isArrayValue: boolean, diff: DiffMeta | undefined, ctx: FormatContext): { block: DiffBlockData; childLevel: number }
}

/** Shared helper: generate value tokens with word-level diff support */
export function valueTokens(
  stringify: (v: JsonValue) => string,
  tokenCtor: (value: string, tags?: TokenTag | TokenTag[]) => Token,
  value: JsonValue,
  diff?: DiffMeta,
): Token[] {
  const str = stringify(value)
  if (diff?.replaced !== undefined && typeof value === "string") {
    const changes = diffWords(str, stringify(diff.replaced))
    return changes.map<Token>((c) => tokenCtor(c.value).cond("before", !!c.added).cond("after", !!c.removed))
  }
  const content: Token[] = []
  if (diff?.replaced !== undefined) {
    content.push(tokenCtor(stringify(diff.replaced), "before"))
  }
  content.push(tokenCtor(str).cond("after", diff?.replaced !== undefined))
  return content
}

/** Recursively build the diff tree for an input object/array */
export function buildDiff(
  input: Record<string, unknown> | unknown[],
  parent: DiffBlockData,
  strategy: FormatStrategy,
  ctx: FormatContext = { last: false, level: 0 },
): void {
  const isArray = Array.isArray(input)
  // Mutable iteration context — postAddBlock may modify level for subsequent siblings
  const iterCtx: FormatContext = { ...ctx }

  if (isArray) {
    for (let i = 0; i < input.length; i++) {
      iterCtx.last = i === input.length - 1
      buildChildBlock(input, i, parent, strategy, iterCtx)
    }
  } else {
    const keys = Object.keys(input).filter((k) => k !== metaKey)
    for (let i = 0; i < keys.length; i++) {
      iterCtx.last = i === keys.length - 1
      buildChildBlock(input, keys[i], parent, strategy, iterCtx)
    }
  }

  strategy.addBlockTokens(parent, isArray)
}

/** Build a single child block (leaf or container) */
function buildChildBlock(
  input: Record<string, unknown> | unknown[],
  key: string | number,
  parent: DiffBlockData,
  strategy: FormatStrategy,
  ctx: FormatContext,
): void {
  const value = (input as Record<string | number, unknown>)[key]
  const metaRecord = metaKey in input ? (input as Record<string, unknown>)[metaKey] as Record<string, DiffMeta> | undefined : undefined
  let diff: DiffMeta | undefined = metaRecord ? metaRecord[key as string] : undefined

  // Handle nested array format from api-smart-diff (when arrayMeta is not set).
  // In that case the parent $diff entry looks like { array: { "0": DiffMeta, ... } }
  // which has no `action` property. Discard it so children don't inherit a malformed diff.
  if (diff && !('action' in diff) && 'array' in (diff as Record<string, unknown>)) {
    diff = undefined
  }

  if (diff) {
    parent.addDiff(diff)
  } else {
    diff = parent.diff?.action !== "rename" ? parent.diff : diff
  }

  const { nextLine, indent } = parent
  const isInputArray = Array.isArray(input)

  const encodedKey = encodeKey(String(key))
  const blockId = parent.id ? `${parent.id}/${encodedKey}` : encodedKey

  let block: DiffBlockData
  if (typeof value !== "object" || value instanceof Date || isEmpty(value)) {
    // Leaf node
    const leafValue = value as JsonValue
    const tokens = isInputArray
      ? strategy.arrLineTokens(leafValue, diff, ctx)
      : strategy.propLineTokens(key, leafValue, diff, ctx)

    block = new DiffBlockData(nextLine, indent + 2, tokens, diff, blockId)
  } else {
    // Container node
    const isArrayValue = Array.isArray(value)
    let childLevel = 0

    if (isInputArray && strategy.createArrayContainerBlock) {
      const result = strategy.createArrayContainerBlock(parent, isArrayValue, diff, ctx)
      block = result.block
      childLevel = result.childLevel
    } else if (isInputArray) {
      block = new DiffBlockData(nextLine, indent + 2, strategy.beginBlockTokens(isArrayValue, ctx), diff)
    } else {
      block = new DiffBlockData(nextLine, indent + 2, strategy.propBlockTokens(isArrayValue, key, diff, ctx), diff)
    }

    block.id = blockId

    buildDiff(value as Record<string, unknown> | unknown[], block, strategy, { last: false, level: childLevel })

    // When arrayMeta is enabled, per-item diffs live on the array's own $diff
    // but the parent object has no entry for this key. Propagate the first
    // child diff to the container so it is marked as changed.
    if (!block.diff && isArrayValue && metaKey in (value as Record<string, unknown>)) {
      const childWithDiff = block.children.find(c => c.diff)
      if (childWithDiff?.diff) {
        block.diff = childWithDiff.diff
      }
    }

    const endTokens = strategy.endBlockTokens(isArrayValue, ctx)
    if (endTokens.length) {
      block.addBlock(new DiffBlockData(block.nextLine, indent + 2, endTokens, diff))
    }
  }

  parent.addBlock(block)
  strategy.postAddBlock?.(parent, block, ctx)
}

