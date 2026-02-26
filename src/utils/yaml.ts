import type { JsonValue } from "../types";

function yamlStringify(value: JsonValue): string {
	if (value == null) {
		return "null";
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (Array.isArray(value)) {
		return "[]";
	}
	if (typeof value === "object") {
		return "{}";
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		if (value === Infinity) return ".Inf";
		if (value === -Infinity) return "-.Inf";
		if (Number.isNaN(value)) return ".NaN";
		return String(value);
	}
	// value is now narrowed to string
	if (/^\d+$/.test(value)) {
		return `'${value}'`;
	}
	if (!Number.isNaN(Number(value)) && value.replace(/\s+/g, "") !== "") {
		return `'${value}'`;
	}
	if (requiresDoubleQuoting(value)) {
		return escapeWithDoubleQuotes(value);
	}
	if (requiresSingleQuoting(value)) {
		return escapeWithSingleQuotes(value);
	}
	if ("" === value) {
		return '""';
	}
	const ref = value.toLowerCase();
	if (ref === "null" || ref === "~" || ref === "true" || ref === "false") {
		return `'${value}'`;
	}
	// Default
	return value;
}

function requiresDoubleQuoting(value: string) {
	return PATTERN_CHARACTERS_TO_ESCAPE.test(value);
}

function escapeWithDoubleQuotes(value: string) {
	const result = value.replace(PATTERN_MAPPING_ESCAPEES, (str: string) => {
		return MAPPING_ESCAPEES_TO_ESCAPED[str];
	});
	return `"${result}"`;
}

function requiresSingleQuoting(value: string) {
	if (value.length === 0) return false;

	const first = value[0];

	// First character: c-indicator that always needs quoting
	if (C_INDICATORS_ALWAYS.has(first)) {
		return true;
	}

	// -, ?, : at start: only need quoting when followed by space or single char
	if (C_INDICATORS_CONDITIONAL.has(first) && (value.length === 1 || /\s/.test(value[1]))) {
		return true;
	}

	// Leading or trailing whitespace
	if (/^\s|\s$/.test(value)) {
		return true;
	}

	// ": " (colon-space) or " #" (space-hash) anywhere, or ":" at end
	if (PATTERN_PLAIN_SCALAR_BREAKS.test(value)) {
		return true;
	}

	return false;
}

function escapeWithSingleQuotes(value: string) {
	return `'${value.replace(/'/g, "''")}'`;
}

export const YAML = {
	stringify: yamlStringify,
	requiresDoubleQuoting,
	escapeWithDoubleQuotes,
	requiresSingleQuoting,
	escapeWithSingleQuotes,
};

const ch = String.fromCharCode;
const LIST_ESCAPEES = [
	"\\",
	"\\\\",
	'\\"',
	'"',
	"\x00",
	"\x01",
	"\x02",
	"\x03",
	"\x04",
	"\x05",
	"\x06",
	"\x07",
	"\x08",
	"\x09",
	"\x0a",
	"\x0b",
	"\x0c",
	"\x0d",
	"\x0e",
	"\x0f",
	"\x10",
	"\x11",
	"\x12",
	"\x13",
	"\x14",
	"\x15",
	"\x16",
	"\x17",
	"\x18",
	"\x19",
	"\x1a",
	"\x1b",
	"\x1c",
	"\x1d",
	"\x1e",
	"\x1f",
	ch(0x0085),
	ch(0x00a0),
	ch(0x2028),
	ch(0x2029),
];
const LIST_ESCAPED = [
	"\\\\",
	'\\"',
	'\\"',
	'\\"',
	"\\0",
	"\\x01",
	"\\x02",
	"\\x03",
	"\\x04",
	"\\x05",
	"\\x06",
	"\\a",
	"\\b",
	"\\t",
	"\\n",
	"\\v",
	"\\f",
	"\\r",
	"\\x0e",
	"\\x0f",
	"\\x10",
	"\\x11",
	"\\x12",
	"\\x13",
	"\\x14",
	"\\x15",
	"\\x16",
	"\\x17",
	"\\x18",
	"\\x19",
	"\\x1a",
	"\\e",
	"\\x1c",
	"\\x1d",
	"\\x1e",
	"\\x1f",
	"\\N",
	"\\_",
	"\\L",
	"\\P",
];
const MAPPING_ESCAPEES_TO_ESCAPED = (() => {
	const mapping: Record<string, string> = {};
	for (let i = 0, j = 0, ref = LIST_ESCAPEES.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
		mapping[LIST_ESCAPEES[i]] = LIST_ESCAPED[i];
	}
	return mapping;
})();

const PATTERN_MAPPING_ESCAPEES = new RegExp(LIST_ESCAPEES.join("|").split("\\").join("\\\\"));
// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional - detects YAML characters requiring escaping
const PATTERN_CHARACTERS_TO_ESCAPE = /[\x00-\x1f]|\xc2\x85|\xc2\xa0|\xe2\x80\xa8|\xe2\x80\xa9/;
// Characters that are c-indicators and ALWAYS need quoting at position 0
// (excludes -, ?, : which are conditional on following character)
const C_INDICATORS_ALWAYS = new Set([",", "[", "]", "{", "}", "#", "&", "*", "!", "|", ">", "'", '"', "%", "@", "`"]);

// Characters that need quoting at position 0 ONLY when followed by space or at end
const C_INDICATORS_CONDITIONAL = new Set(["-", "?", ":"]);

// Patterns that break plain scalars anywhere in the string
const PATTERN_PLAIN_SCALAR_BREAKS = /: | #|:\s*$/;
