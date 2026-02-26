import type { ActionType, DiffMeta, DiffType } from "api-smart-diff";

export const metaKey = "$diff";
export const diffTypes: DiffType[] = ["breaking", "non-breaking", "annotation", "unclassified"];

export type TokenTag = "before" | "after" | "empty" | "collapsed" | "expanded";

export type TokenType = "key" | "index" | "value" | "spec" | DiffType;
export type LineDiff = {
	type: DiffType;
	action: ActionType;
};

export class Token {
	public tags: TokenTag[];
	public type: TokenType;
	public value: string;

	constructor(type: TokenType, value: string, tags?: TokenTag[] | TokenTag) {
		this.type = type;
		this.value = value;
		this.tags = Array.isArray(tags) ? tags : tags ? [tags] : [];
	}

	static Key(value: string, tags?: TokenTag | TokenTag[]) {
		return new Token("key", value, tags);
	}

	static Index(value: string, tags?: TokenTag | TokenTag[]) {
		return new Token("index", value, tags);
	}

	static Value(value: string, tags?: TokenTag | TokenTag[]) {
		return new Token("value", value, tags);
	}

	/** Token pool for common spec tokens to reduce GC pressure */
	private static readonly _pool = new Map<string, Token>();

	static Spec(value: string, tags?: TokenTag | TokenTag[]) {
		// Pool untagged common spec tokens
		if (tags === undefined || (Array.isArray(tags) && tags.length === 0)) {
			const cached = Token._pool.get(value);
			if (cached) return cached;
			const token = new Token("spec", value);
			// Only pool short common tokens
			if (value.length <= 4) {
				Token._pool.set(value, token);
			}
			return token;
		}
		return new Token("spec", value, tags);
	}

	static Change(count: number, changeIndex: number, tags?: TokenTag | TokenTag[]) {
		return new Token(diffTypes[changeIndex], String(count), tags);
	}

	public cond(value: TokenTag | TokenTag[], cond = true): Token {
		if (!cond) return this;
		const newTags = [...this.tags, ...(Array.isArray(value) ? value : [value])];
		return new Token(this.type, this.value, newTags);
	}
}

export class DiffLineData {
	public index: number;
	public indent: number;
	public tokens: Token[];
	public diff?: DiffMeta;

	constructor(index: number, indent: number, tokens: Token[], diff?: DiffMeta) {
		this.index = index;
		this.indent = indent;
		this.tokens = tokens;
		this.diff = diff;
	}
}

export class DiffBlockData extends DiffLineData {
	public id: string;
	public children: DiffBlockData[];
	public diffs: number[];

	public lines: number;

	public get nextLine() {
		return this.index + this.lines;
	}

	constructor(index: number, indent: number, tokens: Token[], diff?: DiffMeta, id = "") {
		super(index, indent, tokens, diff);
		this.id = id;
		this.children = [];
		this.diffs = [0, 0, 0, 0];
		this.lines = tokens.length ? 1 : 0;
	}

	public addDiff(diff: DiffMeta) {
		const i = diffTypes.indexOf(diff.type);
		this.diffs[i]++;
	}

	public addBlock(block: DiffBlockData) {
		this.lines += block.lines;
		this.children.push(block);
		block.diffs.forEach((v, i) => {
			this.diffs[i] += v;
		});
	}
}
