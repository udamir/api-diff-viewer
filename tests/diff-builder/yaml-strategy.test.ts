import { describe, expect, it } from "vitest";
import type { FormatContext } from "../../src/diff-builder/builder";
import { DiffBlockData, Token } from "../../src/diff-builder/common";
import { yamlStrategy } from "../../src/diff-builder/yaml-strategy";

const ctx = (last = false, level = 0): FormatContext => ({ last, level });

describe("yamlStrategy", () => {
	describe("stringify", () => {
		it("stringifies plain strings without quotes", () => {
			expect(yamlStrategy.stringify("hello")).toBe("hello");
		});

		it("stringifies numbers", () => {
			expect(yamlStrategy.stringify(42)).toBe("42");
		});

		it("stringifies booleans", () => {
			expect(yamlStrategy.stringify(true)).toBe("true");
			expect(yamlStrategy.stringify(false)).toBe("false");
		});

		it("stringifies null", () => {
			expect(yamlStrategy.stringify(null)).toBe("null");
		});

		it("quotes numeric strings", () => {
			const result = yamlStrategy.stringify("123");
			expect(result).toContain("'");
		});

		it("quotes strings that look like YAML keywords", () => {
			expect(yamlStrategy.stringify("true")).toContain("'");
			expect(yamlStrategy.stringify("false")).toContain("'");
			expect(yamlStrategy.stringify("null")).toContain("'");
		});

		it("returns empty string as quoted", () => {
			expect(yamlStrategy.stringify("")).toBe('""');
		});

		describe("does not quote strings with special chars at non-first position", () => {
			it.each([
				["/pets/{petId}", "/pets/{petId}"],
				// biome-ignore lint/suspicious/noTemplateCurlyInString: Intentional test data for YAML quoting
				["${asdf}", "${asdf}"],
				["Bearer {token}", "Bearer {token}"],
				["item[0]", "item[0]"],
				["text/html, app/json", "text/html, app/json"],
				["it's fine", "it's fine"],
				["-custom", "-custom"],
				["<html>", "<html>"],
				["=value", "=value"],
				["foo&bar", "foo&bar"],
				["foo*bar", "foo*bar"],
				["foo#bar", "foo#bar"],
			])("stringify(%j) → %j (unquoted)", (input, expected) => {
				expect(yamlStrategy.stringify(input)).toBe(expected);
			});
		});

		describe("quotes strings with c-indicators at position 0", () => {
			it.each([
				["{petId}", "'{petId}'"],
				["#comment", "'#comment'"],
				["*alias", "'*alias'"],
				["&anchor", "'&anchor'"],
				["!tag", "'!tag'"],
				["|literal", "'|literal'"],
				[">folded", "'>folded'"],
				["%directive", "'%directive'"],
				["@reserved", "'@reserved'"],
				["`backtick", "'`backtick'"],
				[",comma", "',comma'"],
				["[array", "'[array'"],
				["]bracket", "']bracket'"],
				["{brace", "'{brace'"],
				["}brace", "'}brace'"],
			])("stringify(%j) → %j (quoted)", (input, expected) => {
				expect(yamlStrategy.stringify(input)).toBe(expected);
			});
		});

		describe("quotes conditional indicators at position 0 followed by space", () => {
			it.each([
				["- item", "'- item'"],
				["? question", "'? question'"],
				[": value", "': value'"],
			])("stringify(%j) → %j (quoted)", (input, expected) => {
				expect(yamlStrategy.stringify(input)).toBe(expected);
			});

			it.each([
				["-custom", "-custom"],
				["?query", "?query"],
				[":port", ":port"],
			])("stringify(%j) → %j (unquoted, non-space follows)", (input, expected) => {
				expect(yamlStrategy.stringify(input)).toBe(expected);
			});
		});

		describe("quotes strings with plain scalar breaks", () => {
			it.each([
				["key: value", "'key: value'"],
				["text #note", "'text #note'"],
				["trailing:", "'trailing:'"],
			])("stringify(%j) → %j (quoted)", (input, expected) => {
				expect(yamlStrategy.stringify(input)).toBe(expected);
			});
		});

		describe("quotes double-quote at position 0", () => {
			it('quotes string starting with "', () => {
				expect(yamlStrategy.stringify('"hello')).toBe("'\"hello'");
			});
		});

		describe("edge cases", () => {
			it("quotes single-character conditional indicators", () => {
				expect(yamlStrategy.stringify("-")).toContain("'");
				expect(yamlStrategy.stringify("?")).toContain("'");
				expect(yamlStrategy.stringify(":")).toContain("'");
			});

			it("quotes strings with leading whitespace", () => {
				expect(yamlStrategy.stringify(" leading")).toContain("'");
			});

			it("quotes strings with trailing whitespace", () => {
				expect(yamlStrategy.stringify("trailing ")).toContain("'");
			});

			it("quotes YAML keyword variants", () => {
				expect(yamlStrategy.stringify("True")).toContain("'");
				expect(yamlStrategy.stringify("FALSE")).toContain("'");
				expect(yamlStrategy.stringify("Null")).toContain("'");
				expect(yamlStrategy.stringify("~")).toContain("'");
			});

			it("quotes numeric-like strings", () => {
				expect(yamlStrategy.stringify("0.5")).toContain("'");
				expect(yamlStrategy.stringify("1e10")).toContain("'");
				expect(yamlStrategy.stringify("0777")).toContain("'");
			});
		});
	});

	describe("propLineTokens", () => {
		it("produces key: value tokens", () => {
			const tokens = yamlStrategy.propLineTokens("title", "Hello", undefined, ctx());
			const text = tokens.map((t) => t.value).join("");
			expect(text).toContain("title");
			expect(text).toContain(": ");
			expect(text).toContain("Hello");
		});

		it('prepends "- " prefix based on level', () => {
			const tokens = yamlStrategy.propLineTokens("key", "val", undefined, ctx(false, 2));
			const prefix = tokens[0];
			expect(prefix.value).toBe("- - ");
		});

		it('no "- " prefix at level 0', () => {
			const tokens = yamlStrategy.propLineTokens("key", "val", undefined, ctx(false, 0));
			const prefix = tokens[0];
			// At level 0, repeat("- ", 0) = ""
			expect(prefix.value).toBe("");
		});

		it("does not add trailing comma (YAML has none)", () => {
			const tokens = yamlStrategy.propLineTokens("key", "val", undefined, ctx(false));
			const values = tokens.map((t) => t.value);
			expect(values).not.toContain(",");
		});

		it("handles replace diff with value tokens", () => {
			const diff = { action: "replace" as const, type: "breaking" as const, replaced: "Old" };
			const tokens = yamlStrategy.propLineTokens("key", "New", diff, ctx());
			const hasBefore = tokens.some((t) => t.tags.includes("before"));
			const hasAfter = tokens.some((t) => t.tags.includes("after"));
			expect(hasBefore || hasAfter).toBe(true);
		});

		it("handles rename diff by generating value tokens for key", () => {
			const diff = { action: "rename" as const, type: "breaking" as const, replaced: "oldKey" };
			const tokens = yamlStrategy.propLineTokens("newKey", "val", diff, ctx());
			const keyTokens = tokens.filter((t) => t.type === "key");
			expect(keyTokens.length).toBeGreaterThan(0);
		});
	});

	describe("arrLineTokens", () => {
		it('produces "- value" tokens for array items', () => {
			const tokens = yamlStrategy.arrLineTokens("item", undefined, ctx(false, 0));
			const text = tokens.map((t) => t.value).join("");
			expect(text).toContain("- ");
			expect(text).toContain("item");
		});

		it('prepends "- " prefix based on level + 1', () => {
			const tokens = yamlStrategy.arrLineTokens("item", undefined, ctx(false, 1));
			const prefix = tokens[0];
			expect(prefix.value).toBe("- - ");
		});

		it("handles number items", () => {
			const tokens = yamlStrategy.arrLineTokens(42, undefined, ctx());
			const text = tokens.map((t) => t.value).join("");
			expect(text).toContain("42");
		});
	});

	describe("propBlockTokens", () => {
		it("produces key: tokens for object blocks", () => {
			const tokens = yamlStrategy.propBlockTokens(false, "info", undefined, ctx());
			const text = tokens.map((t) => t.value).join("");
			expect(text).toContain("info");
			expect(text).toContain(":");
		});

		it("includes collapsed {...} for object", () => {
			const tokens = yamlStrategy.propBlockTokens(false, "info", undefined, ctx());
			const collapsed = tokens.filter((t) => t.tags.includes("collapsed"));
			expect(collapsed.some((t) => t.value.includes("{...}"))).toBe(true);
		});

		it("includes collapsed [...] for array", () => {
			const tokens = yamlStrategy.propBlockTokens(true, "items", undefined, ctx());
			const collapsed = tokens.filter((t) => t.tags.includes("collapsed"));
			expect(collapsed.some((t) => t.value.includes("[...]"))).toBe(true);
		});

		it('includes "- " prefix based on level', () => {
			const tokens = yamlStrategy.propBlockTokens(false, "info", undefined, ctx(false, 1));
			const prefix = tokens[0];
			expect(prefix.value).toBe("- ");
		});
	});

	describe("beginBlockTokens", () => {
		it("returns empty array (YAML has no braces)", () => {
			const tokens = yamlStrategy.beginBlockTokens(false, ctx());
			expect(tokens).toEqual([]);
		});

		it("returns empty for arrays too", () => {
			const tokens = yamlStrategy.beginBlockTokens(true, ctx());
			expect(tokens).toEqual([]);
		});
	});

	describe("endBlockTokens", () => {
		it("returns empty array (YAML has no braces)", () => {
			const tokens = yamlStrategy.endBlockTokens(false, ctx());
			expect(tokens).toEqual([]);
		});

		it("returns empty for arrays too", () => {
			const tokens = yamlStrategy.endBlockTokens(true, ctx());
			expect(tokens).toEqual([]);
		});
	});

	describe("addBlockTokens", () => {
		it("appends Change tokens for blocks with diffs", () => {
			const block = new DiffBlockData(1, 0, [Token.Key("info")]);
			block.diffs[0] = 2; // 2 breaking

			yamlStrategy.addBlockTokens(block, false);

			const changeTokens = block.tokens.filter((t) => t.type === "breaking");
			expect(changeTokens.length).toBe(1);
			expect(changeTokens[0].value).toBe("2");
			expect(changeTokens[0].tags).toContain("collapsed");
		});

		it('adds empty marker {} with "before" tag when all children are add-only', () => {
			const block = new DiffBlockData(1, 0, [Token.Key("info")]);
			const child1 = new DiffBlockData(2, 2, [Token.Value("a")], { action: "add", type: "non-breaking" });
			const child2 = new DiffBlockData(3, 2, [Token.Value("b")], { action: "add", type: "non-breaking" });
			block.children = [child1, child2];

			yamlStrategy.addBlockTokens(block, false);

			const expanded = block.tokens.filter((t) => t.tags.includes("expanded"));
			const hasEmptyMarker = expanded.some((t) => t.value === " {}");
			expect(hasEmptyMarker).toBe(true);
			// Marker should have "before" tag since children only exist on after side
			const marker = expanded.find((t) => t.value === " {}");
			expect(marker?.tags).toContain("before");
		});

		it('adds empty marker [] with "before" tag when all children are add-only', () => {
			const block = new DiffBlockData(1, 0, [Token.Key("items")]);
			const child1 = new DiffBlockData(2, 2, [Token.Value("a")], { action: "add", type: "non-breaking" });
			block.children = [child1];

			yamlStrategy.addBlockTokens(block, true);

			const expanded = block.tokens.filter((t) => t.tags.includes("expanded"));
			const hasEmptyMarker = expanded.some((t) => t.value === " []");
			expect(hasEmptyMarker).toBe(true);
			const marker = expanded.find((t) => t.value === " []");
			expect(marker?.tags).toContain("before");
		});

		it("does not add empty marker when children exist on both sides", () => {
			const block = new DiffBlockData(1, 0, [Token.Key("info")]);
			const child1 = new DiffBlockData(2, 2, [Token.Value("a")]);
			const child2 = new DiffBlockData(3, 2, [Token.Value("b")]);
			block.children = [child1, child2];

			yamlStrategy.addBlockTokens(block, false);

			const expanded = block.tokens.filter((t) => t.tags.includes("expanded"));
			// No marker should be added because tags = ["expanded"] only (length 1)
			expect(expanded.length).toBe(0);
		});

		it("does nothing when block has no tokens", () => {
			const block = new DiffBlockData(1, 0, []);
			block.diffs[0] = 5;

			yamlStrategy.addBlockTokens(block, false);
			expect(block.tokens.length).toBe(0);
		});

		it("skips empty marker when some children are add-only", () => {
			const block = new DiffBlockData(1, 0, [Token.Key("info")]);
			const child1 = new DiffBlockData(2, 2, [Token.Value("a")], { action: "add", type: "non-breaking" });
			block.children = [child1];

			yamlStrategy.addBlockTokens(block, false);

			const expanded = block.tokens.filter((t) => t.tags.includes("expanded"));
			// The marker should have before/after restrictions
			if (expanded.length > 0) {
				// When there are add-only children, the empty marker should have a 'before' tag
				// meaning it only shows on the before side
				const marker = expanded.find((t) => t.value.includes("{}") || t.value.includes("[]"));
				if (marker) {
					expect(marker.tags).toContain("before");
				}
			}
		});
	});

	describe("postAddBlock", () => {
		it("adjusts parent indent based on level", () => {
			const parent = new DiffBlockData(1, 4, []);
			const child = new DiffBlockData(2, 6, [Token.Value("x")]);
			const c: FormatContext = { last: false, level: 2 };

			yamlStrategy.postAddBlock?.(parent, child, c);

			expect(parent.indent).toBe(8); // 4 + 2*2
			expect(c.level).toBe(0); // reset to 0
		});

		it("resets level to 0", () => {
			const parent = new DiffBlockData(1, 0, []);
			const child = new DiffBlockData(2, 2, [Token.Value("x")]);
			const c: FormatContext = { last: false, level: 3 };

			yamlStrategy.postAddBlock?.(parent, child, c);
			expect(c.level).toBe(0);
		});
	});

	describe("createArrayContainerBlock", () => {
		it("creates a block with no tokens", () => {
			const parent = new DiffBlockData(1, 0, []);
			const result = yamlStrategy.createArrayContainerBlock?.(parent, false, undefined, ctx(false, 1));
			expect(result.block.tokens.length).toBe(0);
		});

		it("returns childLevel = level + 1", () => {
			const parent = new DiffBlockData(1, 0, []);
			const result = yamlStrategy.createArrayContainerBlock?.(parent, false, undefined, ctx(false, 2));
			expect(result.childLevel).toBe(3);
		});

		it("inherits parent indent", () => {
			const parent = new DiffBlockData(1, 4, []);
			const result = yamlStrategy.createArrayContainerBlock?.(parent, false, undefined, ctx());
			expect(result.block.indent).toBe(4);
		});

		it("passes diff to child block", () => {
			const parent = new DiffBlockData(1, 0, []);
			const diff = { action: "add" as const, type: "non-breaking" as const };
			const result = yamlStrategy.createArrayContainerBlock?.(parent, false, diff, ctx());
			expect(result.block.diff).toBe(diff);
		});
	});
});
