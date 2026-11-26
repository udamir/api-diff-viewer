<script setup lang="ts">
import type { Extension } from "@codemirror/state";
import type { CompareError, DiffType } from "api-smart-diff";
import { useData } from "vitepress";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, useTemplateRef, watch } from "vue";

import type { ChangeSummary, DiffViewer, DiffViewerError } from "../../../../src";
import {
	DEFAULT_OPTIONS,
	DIFF_TYPE_HINTS,
	DIFF_TYPES,
	type DemoOptions,
	ENGINES,
	type TextFormat,
	convertText,
	decodeState,
	encodeState,
	formatOf,
	mergeOptionsOf,
	optionsCode,
	parseDocument,
	serialize,
	specLabel,
} from "../demo";
import { PRESETS } from "../presets";
import CodeEditor from "./CodeEditor.vue";

/** Pause after the last keystroke before the editors are compared */
const LIVE_DELAY = 250;

const COUNT_KEYS: Record<DiffType, keyof Omit<ChangeSummary, "total" | "byPath">> = {
	breaking: "breaking",
	risky: "risky",
	"non-breaking": "nonBreaking",
	deprecated: "deprecated",
	annotation: "annotation",
	unclassified: "unclassified",
};

const preset = ref<string>(PRESETS[0].id);
const before = ref("");
const after = ref("");
const editorFormat = ref<TextFormat>("yaml");
const options = reactive<DemoOptions>({ ...DEFAULT_OPTIONS, filters: [] });
const tab = ref<"viewer" | "code" | "problems" | "help">("viewer");
const flash = ref("");

const { isDark } = useData();
const dark = computed(() => (options.theme === "auto" ? isDark.value : options.theme === "dark"));

// ---- the viewer (created in the browser only, from the local sources)

const host = useTemplateRef<HTMLDivElement>("host");
let lib: typeof import("../../../../src") | undefined;
let viewer: DiffViewer | undefined;
let documents: [object, object] | undefined;

const summary = shallowRef<ChangeSummary>();
const problems = shallowRef<CompareError[]>([]);
const viewerError = shallowRef<DiffViewerError>();
const inputError = ref<string>();
const labels = reactive({ before: "", after: "" });
const busy = ref(true);
const rendered = ref(false);
const currentPath = ref<string | null>(null);

/** A diff is shown, but it belongs to earlier input: the current input does not parse or cannot be compared */
const stale = computed(() => rendered.value && (!!inputError.value || !!viewerError.value));
const empty = computed(() => !before.value.trim() || !after.value.trim());

let searchExtensions: (() => Extension[]) | undefined;

const createViewer = () => {
	if (!lib || !host.value || !documents) {
		return;
	}
	viewer?.destroy();
	rendered.value = false;
	const created = lib.createDiffViewer(host.value, documents[0], documents[1], {
		mode: options.mode,
		format: options.format,
		dark: dark.value,
		filters: [...options.filters],
		wordDiffMode: options.wordDiffMode,
		wordWrap: options.wordWrap,
		enableFolding: options.enableFolding,
		showClassification: options.showClassification,
		// the search extension comes from the same CodeMirror copy as the viewer (both are built from source here)
		extensions: options.search && searchExtensions ? searchExtensions() : [],
		mergeOptions: mergeOptionsOf(options),
		// the comparison runs on the main thread after the typing pause (see the Web Worker guide)
		useWorker: false,
	});
	viewer = created;
	created.on("ready", ({ summary: result, errors }) => {
		summary.value = result;
		problems.value = errors;
		viewerError.value = undefined;
		rendered.value = true;
		busy.value = false;
	});
	created.on("error", (error) => {
		viewerError.value = error;
		busy.value = false;
	});
	created.on("navigate", ({ path }) => (currentPath.value = path));
};

let timer: ReturnType<typeof setTimeout> | undefined;

/** Parses both editors and shows their diff; an editor that does not parse keeps the last result (stale) */
const compare = () => {
	timer = undefined;
	if (empty.value) {
		busy.value = false;
		return;
	}
	const parsed: object[] = [];
	for (const [side, text] of [
		["Before", before.value],
		["After", after.value],
	] as const) {
		try {
			parsed.push(parseDocument(text));
		} catch (error) {
			inputError.value = `${side}: ${error instanceof Error ? error.message : String(error)}`;
			busy.value = false;
			return;
		}
	}
	inputError.value = undefined;
	documents = [parsed[0], parsed[1]];
	labels.before = specLabel(parsed[0]);
	labels.after = specLabel(parsed[1]);
	currentPath.value = null;
	if (viewer) {
		viewer.update(parsed[0], parsed[1]);
	} else {
		createViewer();
	}
};

const schedule = (delay = LIVE_DELAY) => {
	busy.value = true;
	clearTimeout(timer);
	timer = setTimeout(compare, delay);
};

watch([before, after], () => schedule());

// ---- runtime options: setters where the viewer has one, a new viewer otherwise

watch(
	() => options.mode,
	(mode) => viewer?.setMode(mode)
);
watch(
	() => options.format,
	(format) => viewer?.setFormat(format)
);
watch(dark, (value) => viewer?.setTheme({ dark: value }));
watch(
	() => [...options.filters],
	(filters) => viewer?.setFilters(filters)
);
watch(
	() => options.wordDiffMode,
	(mode) => viewer?.setWordDiffMode(mode)
);
watch(
	() => options.wordWrap,
	(value) => viewer?.setWordWrap(value)
);
watch(
	() => options.enableFolding,
	(value) => viewer?.setFoldingEnabled(value)
);
watch(
	() => options.showClassification,
	(value) => viewer?.setClassificationEnabled(value)
);
// mergeOptions and extensions are construction options
watch([() => options.merged, () => options.engine, () => options.search], () => createViewer());

const toggleFilter = (type: DiffType) => {
	const index = options.filters.indexOf(type);
	if (index >= 0) {
		options.filters.splice(index, 1);
	} else {
		options.filters.push(type);
	}
};

const count = (type: DiffType) => summary.value?.[COUNT_KEYS[type]] ?? 0;

const goTo = (direction: "next" | "prev") => {
	const navigation = viewer?.navigation;
	const types = [...options.filters];
	const path = direction === "next" ? navigation?.goToNextChange(...types) : navigation?.goToPrevChange(...types);
	currentPath.value = path ?? null;
};

const expandAll = () => {
	viewer?.expandAll();
	options.filters.splice(0);
};

const collapseAll = () => {
	viewer?.collapseAll();
	options.filters.splice(0);
};

// ---- editors, presets and share links

const loadPreset = (id: string) => {
	const found = PRESETS.find((item) => item.id === id);
	if (!found) {
		return;
	}
	before.value = serialize(found.before, editorFormat.value);
	after.value = serialize(found.after, editorFormat.value);
	schedule(0);
};

watch(preset, loadPreset);

const convertEditors = () => {
	before.value = convertText(before.value, editorFormat.value);
	after.value = convertText(after.value, editorFormat.value);
};

const swap = () => {
	const text = before.value;
	before.value = after.value;
	after.value = text;
};

const notify = (message: string) => {
	flash.value = message;
	setTimeout(() => (flash.value = ""), 1800);
};

const share = async () => {
	const hash = await encodeState({ before: before.value, after: after.value }, options);
	const url = `${location.origin}${location.pathname}#${hash}`;
	history.replaceState(null, "", url);
	try {
		await navigator.clipboard.writeText(url);
		notify("Link copied");
	} catch {
		notify("Link in the address bar");
	}
};

const resetOptions = () => {
	Object.assign(options, { ...DEFAULT_OPTIONS, filters: [] });
};

const code = computed(() => optionsCode(options, dark.value));

// the editors of the viewer are measured again when its tab is shown (they were laid out while hidden)
watch(tab, async (value) => {
	if (value !== "viewer" || !viewer) {
		return;
	}
	await nextTick();
	const views = viewer.getEditorViews();
	for (const view of [views.before, views.after, views.unified]) {
		view?.requestMeasure();
	}
});

onMounted(async () => {
	const [source, { search, searchKeymap, highlightSelectionMatches }, { keymap }] = await Promise.all([
		import("../../../../src"),
		import("@codemirror/search"),
		import("@codemirror/view"),
	]);
	lib = source;
	searchExtensions = () => [search(), keymap.of(searchKeymap), highlightSelectionMatches()];
	const state = location.hash.length > 1 ? await decodeState(location.hash.slice(1)) : undefined;
	if (!state) {
		loadPreset(preset.value);
		return;
	}
	// a shared link wins over the preset
	Object.assign(options, { ...DEFAULT_OPTIONS, filters: [] }, state.options);
	preset.value = "";
	editorFormat.value = formatOf(state.before);
	before.value = state.before;
	after.value = state.after;
	schedule(0);
});

onBeforeUnmount(() => {
	clearTimeout(timer);
	viewer?.destroy();
	viewer = undefined;
});
</script>

<template>
	<div class="demo">
		<div class="toolbar">
			<label>
				Example
				<select v-model="preset" aria-label="Example documents">
					<option v-if="!preset" value="" disabled>Shared input</option>
					<option v-for="item in PRESETS" :key="item.id" :value="item.id">{{ item.title }}</option>
				</select>
			</label>
			<label title="The text format of the two editors (rewrites both)">
				Editors
				<select v-model="editorFormat" aria-label="Editor format" @change="convertEditors">
					<option value="yaml">YAML</option>
					<option value="json">JSON</option>
				</select>
			</label>
			<span class="actions">
				<button class="link" type="button" title="Swap before and after" @click="swap">⇄ Swap</button>
				<button class="link" type="button" :disabled="empty" @click="share">Share</button>
				<span v-if="flash" class="flash" role="status">{{ flash }}</span>
			</span>
		</div>

		<div class="panes">
			<section class="pane">
				<header>
					<span>Before <small>{{ labels.before }}</small></span>
					<button class="link" type="button" :disabled="!before" @click="before = ''">Clear</button>
				</header>
				<CodeEditor v-model="before" :language="formatOf(before)" :dark="isDark" label="Before document" />
			</section>
			<section class="pane">
				<header>
					<span>After <small>{{ labels.after }}</small></span>
					<button class="link" type="button" :disabled="!after" @click="after = ''">Clear</button>
				</header>
				<CodeEditor v-model="after" :language="formatOf(after)" :dark="isDark" label="After document" />
			</section>
		</div>

		<section class="output">
			<div class="tabs" role="tablist">
				<button
					role="tab"
					type="button"
					:aria-selected="tab === 'viewer'"
					:class="{ active: tab === 'viewer' }"
					@click="tab = 'viewer'"
				>
					Diff viewer <small>{{ summary?.total ?? 0 }}</small>
				</button>
				<button
					role="tab"
					type="button"
					:aria-selected="tab === 'code'"
					:class="{ active: tab === 'code' }"
					@click="tab = 'code'"
				>
					Code
				</button>
				<button
					role="tab"
					type="button"
					:aria-selected="tab === 'problems'"
					:class="{ active: tab === 'problems' }"
					@click="tab = 'problems'"
				>
					Comparison problems <small>{{ problems.length }}</small>
				</button>
				<button
					v-if="$slots.help"
					role="tab"
					type="button"
					:aria-selected="tab === 'help'"
					:class="{ active: tab === 'help' }"
					@click="tab = 'help'"
				>
					How to use
				</button>
				<span class="tab-status">
					<span v-if="busy && !empty" class="status" role="status">updating…</span>
					<span v-else-if="stale" class="status stale-label" data-testid="stale">stale</span>
				</span>
			</div>

			<div v-show="tab === 'viewer'" class="viewer-tab">
				<div class="controls">
					<label>
						Layout
						<select v-model="options.mode" aria-label="Layout">
							<option value="side-by-side">side-by-side</option>
							<option value="inline">inline</option>
						</select>
					</label>
					<label>
						Output
						<select v-model="options.format" aria-label="Output format">
							<option value="yaml">YAML</option>
							<option value="json">JSON</option>
						</select>
					</label>
					<label>
						Theme
						<select v-model="options.theme" aria-label="Theme">
							<option value="auto">follow page</option>
							<option value="light">light</option>
							<option value="dark">dark</option>
						</select>
					</label>
					<label>
						Word diff
						<select v-model="options.wordDiffMode" aria-label="Word diff">
							<option value="word">word</option>
							<option value="char">char</option>
							<option value="none">none</option>
						</select>
					</label>
					<label title="mergeOptions.merged: the documents as written, or the values the engine compared">
						merged
						<select v-model="options.merged" aria-label="Merged document">
							<option value="original">original</option>
							<option value="normalized">normalized</option>
						</select>
					</label>
					<label title="mergeOptions.engine: force an engine instead of detecting the specification">
						engine
						<select v-model="options.engine" aria-label="Engine">
							<option value="auto">detect</option>
							<option v-for="engine in ENGINES" :key="engine" :value="engine">{{ engine }}</option>
						</select>
					</label>
					<label class="check"><input v-model="options.wordWrap" type="checkbox" /> word wrap</label>
					<label class="check"><input v-model="options.enableFolding" type="checkbox" /> folding</label>
					<label class="check"> <input v-model="options.showClassification" type="checkbox" /> classification </label>
					<label class="check" title="extensions: [search(), keymap.of(searchKeymap)] from @codemirror/search">
						<input v-model="options.search" type="checkbox" /> search (Ctrl+F)
					</label>
					<button class="link" type="button" @click="resetOptions">Reset</button>
				</div>

				<div class="controls">
					<span class="chips" role="group" aria-label="Change type filters">
						<button
							v-for="type in DIFF_TYPES"
							:key="type"
							type="button"
							:class="['chip', type, { active: options.filters.includes(type) }]"
							:aria-pressed="options.filters.includes(type)"
							:title="`${type}: ${DIFF_TYPE_HINTS[type]} (click to filter)`"
							@click="toggleFilter(type)"
						>
							{{ type }} <b>{{ count(type) }}</b>
						</button>
					</span>
					<span class="actions">
						<button class="link" type="button" :disabled="!rendered" @click="goTo('prev')">◀ Previous</button>
						<button class="link" type="button" :disabled="!rendered" @click="goTo('next')">Next ▶</button>
						<button class="link" type="button" :disabled="!rendered" @click="expandAll">Expand all</button>
						<button class="link" type="button" :disabled="!rendered" @click="collapseAll">Collapse all</button>
						<code v-if="currentPath" class="path" title="navigation.getCurrentPath()">{{ currentPath }}</code>
					</span>
				</div>

				<div v-if="inputError && !empty" class="message error-message" role="alert">
					<pre>{{ inputError }}</pre>
					<p v-if="rendered">The diff below is the last valid one (stale) and updates when both documents parse.</p>
				</div>
				<div v-else-if="viewerError" class="message error-message" role="alert" data-testid="viewer-error">
					<pre
						>{{ viewerError.kind === "unsupported-spec" ? "Cannot compare" : "Error" }} ({{ viewerError.kind }}): {{
							viewerError.message
						}}</pre>
					<p v-if="viewerError.kind === 'unsupported-spec'">
						The viewer emitted an <code>error</code> event. Convert Swagger 2.0 to OpenAPI 3 first, or choose
						<code>engine: jsonschema</code> to compare the documents as plain JSON.
					</p>
					<p v-if="rendered">The diff below belongs to the previous documents (stale).</p>
				</div>
				<p v-if="empty" class="placeholder">Enter a before and an after document.</p>

				<div ref="host" :class="['viewer-host', { stale }]" :aria-busy="busy" data-testid="viewer" />
			</div>

			<div v-if="tab === 'code'" class="code-tab">
				<pre><code>{{ code }}</code></pre>
			</div>

			<div v-if="tab === 'problems'" class="problems-tab">
				<p v-if="!problems.length" class="placeholder">
					No problems. Problems inside a comparison that still completed (an unresolved <code>$ref</code>, a rule that
					threw) would be listed here: they come with the <code>ready</code> event and from
					<code>getCompareErrors()</code>.
				</p>
				<ul v-else>
					<li v-for="(problem, index) in problems" :key="index">
						<code>{{ problem.kind }}</code> at <code>/{{ problem.path.join("/") }}</code>: {{ problem.message }}
					</li>
				</ul>
			</div>

			<div v-if="tab === 'help'" class="help vp-doc">
				<slot name="help" />
			</div>
		</section>
	</div>
</template>

<style scoped>
.demo {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.toolbar,
.controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 18px;
	font-size: 13px;
	color: var(--vp-c-text-2);
}

.controls {
	padding: 8px 14px;
	border-bottom: 1px solid var(--vp-c-divider);
}

select {
	margin-left: 6px;
	padding: 3px 8px;
	border: 1px solid var(--vp-c-divider);
	border-radius: 6px;
	background: var(--vp-c-bg);
	color: var(--vp-c-text-1);
}

.check {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.panes {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 12px;
	height: 380px;
}

@media (max-width: 960px) {
	.panes {
		grid-template-columns: minmax(0, 1fr);
		height: auto;
	}

	.pane {
		height: 380px;
	}
}

.pane {
	display: flex;
	flex-direction: column;
	min-height: 0;
	border: 1px solid var(--vp-c-divider);
	border-radius: 10px;
	overflow: hidden;
}

.pane header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 8px 14px;
	border-bottom: 1px solid var(--vp-c-divider);
	font-size: 13px;
	font-weight: 600;
	color: var(--vp-c-text-2);
	background: var(--vp-c-bg-soft);
}

.pane header small {
	margin-left: 6px;
	font-weight: 500;
	color: var(--vp-c-text-3);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px 14px;
}

.link {
	font-size: 13px;
	font-weight: 500;
	color: var(--vp-c-brand-1);
}

.link:disabled {
	color: var(--vp-c-text-3);
	cursor: default;
}

.flash {
	font-weight: 500;
	color: var(--vp-c-green-1);
}

.output {
	border: 1px solid var(--vp-c-divider);
	border-radius: 10px;
	overflow: hidden;
}

.tabs {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	padding: 8px;
	border-bottom: 1px solid var(--vp-c-divider);
	background: var(--vp-c-bg-soft);
}

.tabs [role="tab"] {
	padding: 5px 12px;
	border-radius: 7px;
	font-size: 13px;
	font-weight: 500;
	color: var(--vp-c-text-2);
}

.tabs [role="tab"]:hover {
	color: var(--vp-c-text-1);
}

.tabs [role="tab"].active {
	color: var(--vp-c-brand-1);
	background: var(--vp-c-bg);
	box-shadow: var(--vp-shadow-1);
}

.tabs small {
	margin-left: 4px;
	color: var(--vp-c-text-3);
}

.tab-status {
	margin-left: auto;
	padding-right: 6px;
}

.status {
	font-size: 12px;
	color: var(--vp-c-text-3);
}

.stale-label {
	padding: 0 8px;
	border-radius: 999px;
	font-weight: 600;
	color: var(--vp-c-warning-1);
	background: var(--vp-c-warning-soft);
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

/* the change type chips use the viewer's colours (the --adv-* variables of the portal theme) */
.chip {
	--chip: var(--adv-unclassified);
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 10px;
	border: 1px solid var(--chip);
	border-radius: 999px;
	font-size: 12px;
	font-weight: 600;
	color: var(--chip);
}

.chip b {
	font-weight: 700;
}

.chip.active {
	color: #fff;
	background: var(--chip);
}

.dark .chip.active {
	color: #0d1117;
}

.chip.breaking {
	--chip: var(--adv-breaking);
}

.chip.risky {
	--chip: var(--adv-risky);
}

.chip.non-breaking {
	--chip: var(--adv-non-breaking);
}

.chip.deprecated {
	--chip: var(--adv-deprecated);
}

.chip.annotation {
	--chip: var(--adv-annotation);
}

.path {
	font-size: 12px;
}

.message {
	padding: 10px 14px;
	border-bottom: 1px solid var(--vp-c-divider);
	font-size: 13px;
}

.message pre {
	margin: 0;
	font-family: var(--vp-font-family-mono);
	white-space: pre-wrap;
}

.message p {
	margin: 4px 0 0;
	color: var(--vp-c-text-2);
}

.error-message {
	background: var(--vp-c-danger-soft);
}

.error-message pre {
	color: var(--vp-c-danger-1);
}

.placeholder {
	margin: 0;
	padding: 10px 14px;
	font-size: 13px;
	color: var(--vp-c-text-2);
}

.viewer-host {
	height: 640px;
	transition: opacity 0.2s;
}

.viewer-host.stale {
	opacity: 0.45;
	filter: grayscale(0.6);
}

.code-tab pre {
	margin: 0;
	padding: 14px;
	overflow-x: auto;
	font-family: var(--vp-font-family-mono);
	font-size: 13px;
	line-height: 1.6;
}

.problems-tab ul {
	margin: 0;
	padding: 10px 14px 10px 32px;
	font-size: 13px;
}

/* the "How to use" tab: the page's instructions, at a readable line length */
.help {
	padding: 8px 16px 16px;
	max-width: var(--adv-prose-width);
}
</style>
