import { describe, expect, it } from "vitest";
import { DiffBlockData, DiffLineData, diffTypes, metaKey, Token } from "../../src/diff-builder/common";

describe("Token", () => {
	describe("constructor", () => {
		it("sets type, value, and empty tags by default", () => {
			const t = new Token("key", "foo");
			expect(t.type).toBe("key");
			expect(t.value).toBe("foo");
			expect(t.tags).toEqual([]);
		});

		it("accepts a single tag", () => {
			const t = new Token("value", "bar", "before");
			expect(t.tags).toEqual(["before"]);
		});

		it("accepts an array of tags", () => {
			const t = new Token("spec", ":", ["before", "after"]);
			expect(t.tags).toEqual(["before", "after"]);
		});
	});

	describe("static factories", () => {
		it("Key creates a key token", () => {
			const t = Token.Key("name");
			expect(t.type).toBe("key");
			expect(t.value).toBe("name");
		});

		it("Key with tags", () => {
			const t = Token.Key("name", "before");
			expect(t.tags).toEqual(["before"]);
		});

		it("Index creates an index token", () => {
			const t = Token.Index("0");
			expect(t.type).toBe("index");
			expect(t.value).toBe("0");
		});

		it("Value creates a value token", () => {
			const t = Token.Value("hello");
			expect(t.type).toBe("value");
			expect(t.value).toBe("hello");
		});

		it("Spec creates a spec token", () => {
			const t = Token.Spec(": ");
			expect(t.type).toBe("spec");
			expect(t.value).toBe(": ");
		});

		it("Change creates a token with diff type", () => {
			// changeIndex 0 = "breaking", 1 = "non-breaking", 2 = "annotation", 3 = "unclassified"
			const t = Token.Change(5, 0);
			expect(t.type).toBe("breaking");
			expect(t.value).toBe("5");
		});

		it("Change with different index", () => {
			const t = Token.Change(3, 2, "collapsed");
			expect(t.type).toBe("annotation");
			expect(t.value).toBe("3");
			expect(t.tags).toEqual(["collapsed"]);
		});
	});

	describe("cond", () => {
		it("adds tag when condition is true (default)", () => {
			const t = Token.Value("x").cond("before");
			expect(t.tags).toContain("before");
		});

		it("adds tag when condition is explicitly true", () => {
			const t = Token.Value("x").cond("after", true);
			expect(t.tags).toContain("after");
		});

		it("does not add tag when condition is false", () => {
			const t = Token.Value("x").cond("before", false);
			expect(t.tags).not.toContain("before");
		});

		it("supports array of tags", () => {
			const t = Token.Value("x").cond(["before", "after"]);
			expect(t.tags).toContain("before");
			expect(t.tags).toContain("after");
		});

		it("returns a new token with appended tags (immutable)", () => {
			const t = Token.Value("x");
			const result = t.cond("before");
			expect(result).not.toBe(t);
			expect(result.tags).toContain("before");
			expect(t.tags).not.toContain("before"); // original unchanged
		});

		it("returns the same token when condition is false", () => {
			const t = Token.Value("x");
			const result = t.cond("before", false);
			expect(result).toBe(t);
		});
	});
});

describe("DiffLineData", () => {
	it("stores index, indent, tokens, and diff", () => {
		const tokens = [Token.Key("key"), Token.Spec(": "), Token.Value("val")];
		const diff = { action: "replace" as const, type: "breaking" as const };
		const line = new DiffLineData(5, 4, tokens, diff);

		expect(line.index).toBe(5);
		expect(line.indent).toBe(4);
		expect(line.tokens).toBe(tokens);
		expect(line.diff).toBe(diff);
	});

	it("diff is undefined when not provided", () => {
		const line = new DiffLineData(1, 0, []);
		expect(line.diff).toBeUndefined();
	});
});

describe("DiffBlockData", () => {
	it("extends DiffLineData", () => {
		const block = new DiffBlockData(1, 0, [Token.Key("x")]);
		expect(block).toBeInstanceOf(DiffLineData);
	});

	it("initializes with default values", () => {
		const block = new DiffBlockData(1, 0, [Token.Key("x")]);
		expect(block.id).toBe("");
		expect(block.children).toEqual([]);
		expect(block.diffs).toEqual([0, 0, 0, 0]);
	});

	it("lines is 1 when tokens are non-empty", () => {
		const block = new DiffBlockData(1, 0, [Token.Key("x")]);
		expect(block.lines).toBe(1);
	});

	it("lines is 0 when tokens are empty", () => {
		const block = new DiffBlockData(1, 0, []);
		expect(block.lines).toBe(0);
	});

	it("accepts a custom id", () => {
		const block = new DiffBlockData(1, 0, [], undefined, "info/title");
		expect(block.id).toBe("info/title");
	});

	describe("nextLine", () => {
		it("returns index + lines", () => {
			const block = new DiffBlockData(3, 0, [Token.Key("x")]);
			expect(block.nextLine).toBe(4); // index 3 + lines 1
		});

		it("returns index when no tokens", () => {
			const block = new DiffBlockData(3, 0, []);
			expect(block.nextLine).toBe(3); // index 3 + lines 0
		});
	});

	describe("addDiff", () => {
		it("increments breaking count", () => {
			const block = new DiffBlockData(1, 0, []);
			block.addDiff({ type: "breaking", action: "replace" });
			expect(block.diffs).toEqual([1, 0, 0, 0]);
		});

		it("increments non-breaking count", () => {
			const block = new DiffBlockData(1, 0, []);
			block.addDiff({ type: "non-breaking", action: "add" });
			expect(block.diffs).toEqual([0, 1, 0, 0]);
		});

		it("increments annotation count", () => {
			const block = new DiffBlockData(1, 0, []);
			block.addDiff({ type: "annotation", action: "replace" });
			expect(block.diffs).toEqual([0, 0, 1, 0]);
		});

		it("increments unclassified count", () => {
			const block = new DiffBlockData(1, 0, []);
			block.addDiff({ type: "unclassified", action: "replace" });
			expect(block.diffs).toEqual([0, 0, 0, 1]);
		});

		it("accumulates multiple diffs", () => {
			const block = new DiffBlockData(1, 0, []);
			block.addDiff({ type: "breaking", action: "replace" });
			block.addDiff({ type: "breaking", action: "remove" });
			block.addDiff({ type: "annotation", action: "replace" });
			expect(block.diffs).toEqual([2, 0, 1, 0]);
		});
	});

	describe("addBlock", () => {
		it("appends child to children", () => {
			const parent = new DiffBlockData(1, 0, []);
			const child = new DiffBlockData(1, 2, [Token.Key("a")]);
			parent.addBlock(child);
			expect(parent.children.length).toBe(1);
			expect(parent.children[0]).toBe(child);
		});

		it("accumulates lines from child", () => {
			const parent = new DiffBlockData(1, 0, []);
			const child1 = new DiffBlockData(1, 2, [Token.Key("a")]); // 1 line
			const child2 = new DiffBlockData(2, 2, [Token.Key("b")]); // 1 line
			parent.addBlock(child1);
			parent.addBlock(child2);
			expect(parent.lines).toBe(2);
		});

		it("accumulates diffs from child", () => {
			const parent = new DiffBlockData(1, 0, []);
			const child = new DiffBlockData(1, 2, [Token.Key("a")]);
			child.addDiff({ type: "breaking", action: "replace" });
			child.addDiff({ type: "non-breaking", action: "add" });
			parent.addBlock(child);
			expect(parent.diffs).toEqual([1, 1, 0, 0]);
		});

		it("accumulates diffs from multiple children", () => {
			const parent = new DiffBlockData(1, 0, []);
			const child1 = new DiffBlockData(1, 2, [Token.Key("a")]);
			child1.addDiff({ type: "breaking", action: "replace" });
			const child2 = new DiffBlockData(2, 2, [Token.Key("b")]);
			child2.addDiff({ type: "annotation", action: "add" });
			parent.addBlock(child1);
			parent.addBlock(child2);
			expect(parent.diffs).toEqual([1, 0, 1, 0]);
		});

		it("nextLine updates as children are added", () => {
			const parent = new DiffBlockData(1, 0, []);
			expect(parent.nextLine).toBe(1); // 0 lines
			parent.addBlock(new DiffBlockData(1, 2, [Token.Key("a")]));
			expect(parent.nextLine).toBe(2); // 1 line
			parent.addBlock(new DiffBlockData(2, 2, [Token.Key("b")]));
			expect(parent.nextLine).toBe(3); // 2 lines
		});
	});
});

describe("constants", () => {
	it('metaKey is "$diff"', () => {
		expect(metaKey).toBe("$diff");
	});

	it("diffTypes has 4 entries in the right order", () => {
		expect(diffTypes).toEqual(["breaking", "non-breaking", "annotation", "unclassified"]);
	});
});
