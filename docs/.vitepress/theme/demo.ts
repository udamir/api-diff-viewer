/**
 * What the live demo runs besides the viewer itself: parsing of the editors (JSON or YAML), specification detection,
 * the share-link state and the code snippet of the current options. Pure (no DOM, no Vue), shared with the unit test
 * `tests/docs/demo.test.ts`, so the page and the test run the same code.
 */
import { type CompareEngineName, type CompareOptions, type DiffType, detectSpec } from "api-smart-diff";
import { dump, load } from "js-yaml";

export type TextFormat = "yaml" | "json";

/** Change types from the most to the least severe (the order of the filter chips) */
export const DIFF_TYPES: DiffType[] = ["breaking", "risky", "non-breaking", "deprecated", "annotation", "unclassified"];

export const DIFF_TYPE_HINTS: Record<DiffType, string> = {
	breaking: "existing clients fail",
	risky: "valid for most clients, can break some",
	"non-breaking": "existing clients keep working",
	deprecated: "something was deprecated",
	annotation: "documentation and metadata only",
	unclassified: "no rule applies",
};

export const ENGINES: CompareEngineName[] = ["openapi", "asyncapi", "graphapi", "protoapi", "jsonschema"];

/** The viewer options the demo controls (the `DiffViewerOptions` with plain values) */
export interface DemoOptions {
	mode: "side-by-side" | "inline";
	format: TextFormat;
	theme: "auto" | "light" | "dark";
	filters: DiffType[];
	wordDiffMode: "word" | "char" | "none";
	wordWrap: boolean;
	enableFolding: boolean;
	showClassification: boolean;
	search: boolean;
	merged: "original" | "normalized";
	engine: "auto" | CompareEngineName;
}

export const DEFAULT_OPTIONS: DemoOptions = {
	mode: "side-by-side",
	format: "yaml",
	theme: "auto",
	filters: [],
	wordDiffMode: "word",
	wordWrap: true,
	enableFolding: true,
	showClassification: true,
	search: false,
	merged: "original",
	engine: "auto",
};

/** The `mergeOptions` of the demo options (api-smart-diff `CompareOptions`) */
export const mergeOptionsOf = (options: DemoOptions): CompareOptions => ({
	...(options.merged !== "original" ? { merged: options.merged } : {}),
	...(options.engine !== "auto" ? { engine: options.engine } : {}),
});

/** Parses an editor: JSON first (exact error positions), YAML otherwise (JSON is valid YAML too) */
export const parseDocument = (text: string): object => {
	const trimmed = text.trim();
	if (!trimmed) {
		throw new Error("The document is empty");
	}
	let document: unknown;
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		try {
			document = JSON.parse(trimmed);
		} catch {
			// not strict JSON (comments, trailing commas, YAML flow style): read it as YAML
			document = load(text);
		}
	} else {
		document = load(text);
	}
	if (!document || typeof document !== "object") {
		throw new Error("The document is not an object or an array");
	}
	return document;
};

export const formatOf = (text: string): TextFormat => (/^\s*[{[]/.test(text) ? "json" : "yaml");

export const serialize = (value: unknown, format: TextFormat): string =>
	format === "yaml" ? dump(value, { noRefs: true, lineWidth: 120 }) : `${JSON.stringify(value, null, 2)}\n`;

/** Converts a document to the other text format (keeps text that does not parse) */
export const convertText = (text: string, format: TextFormat): string => {
	try {
		return serialize(parseDocument(text), format);
	} catch {
		return text;
	}
};

/** Human-readable name of the specification of a document, as api-smart-diff detects it */
export const specLabel = (document: unknown): string => {
	try {
		const { engine, version } = detectSpec(document);
		const names: Record<CompareEngineName, string> = {
			openapi: "OpenAPI",
			asyncapi: "AsyncAPI",
			graphapi: "GraphApi",
			protoapi: "ProtoApi",
			jsonschema: "JSON Schema",
		};
		return `${names[engine]}${version ? ` ${version}` : ""}`;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
};

// ---- share links ---------------------------------------------------------------------------------------------------

export interface DemoState {
	before: string;
	after: string;
	options?: Partial<DemoOptions>;
}

const toBase64 = (bytes: Uint8Array): string => {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64 = (text: string): Uint8Array => {
	const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

/** Only the options that differ from the defaults go into a link */
const changedOptions = (options: DemoOptions): Partial<DemoOptions> =>
	Object.fromEntries(
		Object.entries(options).filter(
			([key, value]) => JSON.stringify(value) !== JSON.stringify(DEFAULT_OPTIONS[key as keyof DemoOptions])
		)
	);

const stateJson = (state: DemoState, options: DemoOptions): string =>
	JSON.stringify({ before: state.before, after: state.after, options: changedOptions(options) });

const readState = (json: string): DemoState | undefined => {
	const value = JSON.parse(json) as DemoState;
	if (typeof value?.before !== "string" || typeof value?.after !== "string") {
		return undefined;
	}
	const options = Object.fromEntries(
		Object.entries(value.options ?? {}).filter(([key]) => key in DEFAULT_OPTIONS)
	) as Partial<DemoOptions>;
	return { before: value.before, after: value.after, options };
};

// prefix of a deflate-compressed state (base64url never contains a ".")
const COMPRESSED = "z.";

const pipe = async (bytes: Uint8Array, stream: { readable: ReadableStream; writable: WritableStream }) => {
	const output = new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream)).arrayBuffer();
	return new Uint8Array(await output);
};

/** The state for the URL hash: deflate-compressed where `CompressionStream` exists, plain base64url otherwise */
export const encodeState = async (state: DemoState, options: DemoOptions): Promise<string> => {
	const bytes = new TextEncoder().encode(stateJson(state, options));
	if (typeof CompressionStream !== "function") {
		return toBase64(bytes);
	}
	return COMPRESSED + toBase64(await pipe(bytes, new CompressionStream("deflate")));
};

/** Reads a state of `encodeState` (`undefined` for an invalid one) */
export const decodeState = async (hash: string): Promise<DemoState | undefined> => {
	try {
		if (!hash.startsWith(COMPRESSED)) {
			return readState(new TextDecoder().decode(fromBase64(hash)));
		}
		if (typeof DecompressionStream !== "function") {
			return undefined;
		}
		const bytes = await pipe(fromBase64(hash.slice(COMPRESSED.length)), new DecompressionStream("deflate"));
		return readState(new TextDecoder().decode(bytes));
	} catch {
		return undefined;
	}
};

// ---- code snippet --------------------------------------------------------------------------------------------------

/** The `createDiffViewer` call with the current options (the defaults left out) */
export const optionsCode = (options: DemoOptions, dark: boolean): string => {
	const entries: string[] = [];
	const add = (key: string, value: unknown) => entries.push(`  ${key}: ${JSON.stringify(value)},`);
	if (options.mode !== "side-by-side") add("mode", options.mode);
	if (options.format !== "yaml") add("format", options.format);
	if (dark) add("dark", true);
	if (options.filters.length) add("filters", options.filters);
	if (options.wordDiffMode !== "word") add("wordDiffMode", options.wordDiffMode);
	if (!options.wordWrap) add("wordWrap", false);
	if (options.enableFolding) add("enableFolding", true);
	if (options.showClassification) add("showClassification", true);
	if (options.search) {
		// the extensions must come from the same CodeMirror copy as the viewer (see the guide, CodeMirror extensions)
		entries.push("  extensions: [search(), keymap.of(searchKeymap)], // one CodeMirror instance required");
	}
	const merge = mergeOptionsOf(options);
	const mergeEntries = Object.entries(merge).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
	if (mergeEntries.length) entries.push(`  mergeOptions: { ${mergeEntries.join(", ")} },`);
	const imports = [
		'import { createDiffViewer } from "api-diff-viewer";',
		...(options.search
			? ['import { search, searchKeymap } from "@codemirror/search";', 'import { keymap } from "@codemirror/view";']
			: []),
	];
	return [
		...imports,
		"",
		"// before, after: the parsed documents of the editors",
		`const viewer = createDiffViewer(container, before, after${entries.length ? `, {\n${entries.join("\n")}\n}` : ""});`,
	].join("\n");
};
