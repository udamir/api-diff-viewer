<script setup lang="ts">
import type { EditorView } from "@codemirror/view";
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";

import type { TextFormat } from "../demo";

const props = defineProps<{
	modelValue: string;
	language: TextFormat;
	dark: boolean;
	label: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const host = useTemplateRef<HTMLDivElement>("host");
const view = shallowRef<EditorView>();

let reconfigure: ((language: TextFormat, dark: boolean) => void) | undefined;

onMounted(async () => {
	// CodeMirror touches the DOM, so it is loaded in the browser only; the editor theme is the viewer's own (from src),
	// so the editors and the viewer look alike
	const [
		{ Compartment, EditorState },
		{ EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection },
		{ defaultKeymap, history, historyKeymap, indentWithTab },
		{ bracketMatching, foldGutter, foldKeymap, indentOnInput },
		{ json },
		{ yaml },
		{ diffTheme },
	] = await Promise.all([
		import("@codemirror/state"),
		import("@codemirror/view"),
		import("@codemirror/commands"),
		import("@codemirror/language"),
		import("@codemirror/lang-json"),
		import("@codemirror/lang-yaml"),
		import("../../../../src/themes"),
	]);

	const languages = { json: () => json(), yaml: () => yaml() };
	const languageSlot = new Compartment();
	const themeSlot = new Compartment();

	const base = EditorView.theme({
		"&": { height: "100%" },
		"&.cm-focused": { outline: "none" },
		".cm-scroller": { lineHeight: "1.5" },
		".cm-activeLine": { backgroundColor: "var(--vp-c-default-soft) !important" },
		".cm-activeLineGutter": { backgroundColor: "var(--vp-c-default-soft) !important" },
	});

	view.value = new EditorView({
		parent: host.value!,
		state: EditorState.create({
			doc: props.modelValue,
			extensions: [
				lineNumbers(),
				foldGutter(),
				history(),
				drawSelection(),
				indentOnInput(),
				bracketMatching(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
				EditorView.contentAttributes.of({ "aria-label": props.label }),
				languageSlot.of(languages[props.language]()),
				themeSlot.of(diffTheme({ dark: props.dark })),
				base,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						emit("update:modelValue", update.state.doc.toString());
					}
				}),
			],
		}),
	});

	reconfigure = (language, dark) => {
		view.value?.dispatch({
			effects: [languageSlot.reconfigure(languages[language]()), themeSlot.reconfigure(diffTheme({ dark }))],
		});
	};
});

watch(
	() => props.modelValue,
	(value) => {
		const current = view.value?.state.doc.toString();
		if (view.value && value !== current) {
			view.value.dispatch({ changes: { from: 0, to: view.value.state.doc.length, insert: value } });
		}
	}
);

watch([() => props.language, () => props.dark], ([language, dark]) => reconfigure?.(language, dark));

onBeforeUnmount(() => view.value?.destroy());
</script>

<template>
	<div ref="host" class="code-editor" />
</template>

<style scoped>
.code-editor {
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

.code-editor :deep(.cm-editor) {
	height: 100%;
}
</style>
