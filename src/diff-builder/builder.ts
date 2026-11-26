import type { DiffMeta, MergeMeta } from "api-smart-diff";
import { diffWords } from "diff";
import type { JsonValue } from "../types";
import { encodeKey, isEmpty } from "../utils/common";
import { DiffBlockData, metaKey, type Token, type TokenTag } from "./common";

/** Format-specific context passed through the traversal. Mutable within a sibling iteration. */
export interface FormatContext {
	last: boolean;
	level: number;
	/** When true, skip diffWords() in valueTokens for large documents */
	skipWordDiff?: boolean;
}

/** Strategy interface for format-specific token generation */
export interface FormatStrategy {
	stringify(value: JsonValue): string;
	propLineTokens(key: string | number, value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext): Token[];
	arrLineTokens(value: JsonValue, diff: DiffMeta | undefined, ctx: FormatContext): Token[];
	propBlockTokens(isArray: boolean, key: string | number, diff: DiffMeta | undefined, ctx: FormatContext): Token[];
	beginBlockTokens(isArray: boolean, ctx: FormatContext): Token[];
	endBlockTokens(isArray: boolean, ctx: FormatContext): Token[];
	addBlockTokens(block: DiffBlockData, isArray: boolean): void;
	/** Called after each child block is added. May mutate ctx (e.g. YAML resets level). */
	postAddBlock?(parent: DiffBlockData, block: DiffBlockData, ctx: FormatContext): void;
	/**
	 * Create a container block for an array item that is itself an object/array.
	 * Returns the block and the level to use when recursing into its children.
	 * If not provided, the default beginBlockTokens path is used.
	 */
	createArrayContainerBlock?(
		parent: DiffBlockData,
		isArrayValue: boolean,
		diff: DiffMeta | undefined,
		ctx: FormatContext
	): { block: DiffBlockData; childLevel: number };
}

/**
 * Shared helper: generate value tokens with word-level diff support.
 *
 * @param skipWordDiff - When true, emit simple before/after tokens without
 *   running diffWords(). Used for large documents (>3K lines) where word-level
 *   diffs are deferred to the viewport-based requestor.
 */
export function valueTokens(
	stringify: (v: JsonValue) => string,
	tokenCtor: (value: string, tags?: TokenTag | TokenTag[]) => Token,
	value: JsonValue,
	diff?: DiffMeta,
	skipWordDiff?: boolean
): Token[] {
	const str = stringify(value);
	if (diff?.replaced !== undefined && typeof value === "string" && !skipWordDiff) {
		const changes = diffWords(str, stringify(diff.replaced));
		return changes.map<Token>((c) => tokenCtor(c.value).cond("before", !!c.added).cond("after", !!c.removed));
	}
	const content: Token[] = [];
	if (diff?.replaced !== undefined) {
		content.push(tokenCtor(stringify(diff.replaced), "before"));
	}
	content.push(tokenCtor(str).cond("after", diff?.replaced !== undefined));
	return content;
}

/** Per-item metadata of an array, keyed by the item's position in the merged array */
export type ArrayMetaRecord = Record<string | number, MergeMeta>;

/**
 * Recursively build the diff tree for an input object/array.
 *
 * @param arrayMeta - For an array input: the item metadata api-smart-diff stored on the
 *   parent as `{ array: {...} }` (the default layout, `arrayMeta: false`). Metadata stored
 *   on the array itself (`arrayMeta: true`) is read from `input[metaKey]` instead.
 */
export function buildDiff(
	input: Record<string, unknown> | unknown[],
	parent: DiffBlockData,
	strategy: FormatStrategy,
	ctx: FormatContext = { last: false, level: 0 },
	arrayMeta?: ArrayMetaRecord
): void {
	const isArray = Array.isArray(input);
	// Mutable iteration context — postAddBlock may modify level for subsequent siblings
	const iterCtx: FormatContext = { ...ctx };

	if (isArray) {
		for (let i = 0; i < input.length; i++) {
			iterCtx.last = i === input.length - 1;
			buildChildBlock(input, i, parent, strategy, iterCtx, arrayMeta);
		}
	} else {
		const keys = Object.keys(input).filter((k) => k !== metaKey);
		for (let i = 0; i < keys.length; i++) {
			iterCtx.last = i === keys.length - 1;
			buildChildBlock(input, keys[i], parent, strategy, iterCtx);
		}
	}

	strategy.addBlockTokens(parent, isArray);
}

/** Whether a meta entry is the `{ array: {...} }` wrapper of an array's item metadata */
function isArrayMetaEntry(meta: MergeMeta | undefined): meta is { array: ArrayMetaRecord } {
	return !!meta && !("action" in meta) && "array" in meta;
}

/** Build a single child block (leaf or container) */
function buildChildBlock(
	input: Record<string, unknown> | unknown[],
	key: string | number,
	parent: DiffBlockData,
	strategy: FormatStrategy,
	ctx: FormatContext,
	arrayMeta?: ArrayMetaRecord
): void {
	const value = (input as Record<string | number, unknown>)[key];
	const metaRecord =
		metaKey in input
			? ((input as Record<string, unknown>)[metaKey] as Record<string | number, MergeMeta> | undefined)
			: arrayMeta;
	const entry = metaRecord ? metaRecord[key] : undefined;

	// Array item metadata in the default api-smart-diff layout: the parent's entry for an
	// array key is { array: { "0": MergeMeta, ... } } (no `action`). It is not a diff of the
	// array itself — pass it down to the array's items instead.
	let childArrayMeta: ArrayMetaRecord | undefined;
	let diff: DiffMeta | undefined;
	if (isArrayMetaEntry(entry)) {
		childArrayMeta = entry.array;
	} else {
		diff = entry as DiffMeta | undefined;
	}

	if (diff) {
		parent.addDiff(diff);
	} else {
		diff = parent.diff?.action !== "rename" ? parent.diff : diff;
	}

	const { nextLine, indent } = parent;
	const isInputArray = Array.isArray(input);

	const encodedKey = encodeKey(String(key));
	const blockId = parent.id ? `${parent.id}/${encodedKey}` : encodedKey;

	let block: DiffBlockData;
	if (typeof value !== "object" || value instanceof Date || isEmpty(value)) {
		// Leaf node
		const leafValue = value as JsonValue;
		const tokens = isInputArray
			? strategy.arrLineTokens(leafValue, diff, ctx)
			: strategy.propLineTokens(key, leafValue, diff, ctx);

		block = new DiffBlockData(nextLine, indent + 2, tokens, diff, blockId);
	} else {
		// Container node
		const isArrayValue = Array.isArray(value);
		let childLevel = 0;

		if (isInputArray && strategy.createArrayContainerBlock) {
			const result = strategy.createArrayContainerBlock(parent, isArrayValue, diff, ctx);
			block = result.block;
			childLevel = result.childLevel;
		} else if (isInputArray) {
			block = new DiffBlockData(nextLine, indent + 2, strategy.beginBlockTokens(isArrayValue, ctx), diff);
		} else {
			block = new DiffBlockData(nextLine, indent + 2, strategy.propBlockTokens(isArrayValue, key, diff, ctx), diff);
		}

		block.id = blockId;

		buildDiff(
			value as Record<string, unknown> | unknown[],
			block,
			strategy,
			{
				last: false,
				level: childLevel,
				skipWordDiff: ctx.skipWordDiff,
			},
			childArrayMeta
		);

		// Per-item diffs of an array (on the parent as { array }, or on the array's own
		// $diff with arrayMeta) are not a diff of the array itself: like an object with
		// changed properties, the container keeps no diff of its own and only aggregates
		// its children's counters (block.diffs). Borrowing a child's diff here would mark
		// the header line as added/replaced and make the summary count the container
		// instead of (and, for add/remove, on top of hiding) the item changes.

		const endTokens = strategy.endBlockTokens(isArrayValue, ctx);
		if (endTokens.length) {
			block.addBlock(new DiffBlockData(block.nextLine, indent + 2, endTokens, diff));
		}
	}

	parent.addBlock(block);
	strategy.postAddBlock?.(parent, block, ctx);
}
