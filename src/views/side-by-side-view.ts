/**
 * Side-by-Side View — Pure DOM dual-editor view
 *
 * Creates two synchronized CodeMirror editors showing before/after content
 * with aligned spacer lines, scroll sync, and optional fold sync.
 */

import { foldGutter } from "@codemirror/language";
import { Compartment, EditorState, type Extension, type StateEffect } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { setEditorSideEffect, setLineMappingsEffect, setWordDiffModeEffect } from "../extensions/aligned-decorations";
import { changeBadges } from "../extensions/change-badges";
import { diffFoldKeymap } from "../extensions/diff-folding";
import { createClassificationGutter, createDiffMarkerGutter } from "../extensions/diff-gutters";
import { createSpacerAwareLineNumbers } from "../extensions/line-numbers";
import { buildWordDiffData, setWordDiffDataEffect, wordDiffPluginOnly } from "../extensions/word-diff";
import { wordDiffRequestor } from "../extensions/word-diff-requestor";
import { setDiffDataEffect, setSideEffect } from "../state/diff-state";
import { extractFoldedBlockIds, restoreFoldsFromBlockIds } from "../sync/fold-state";
import { setupFoldSync } from "../sync/fold-sync";
import { type HeightSyncHandle, setHeightPaddingEffect, setupHeightSync } from "../sync/height-sync";
import { type AlignmentResult, generateAlignedContentFromDiff } from "../sync/visual-alignment";
import type { DiffData, DiffThemeColors, LineMapping } from "../types";

import { BaseView } from "./base-view";

/** Per-side editor state grouping view, container, and compartments */
interface SideEditorState {
	view: EditorView | null;
	container: HTMLElement | null;
	compartments: {
		wordDiff: Compartment;
		foldGutter: Compartment;
		classification: Compartment;
		diffMarkerGutter: Compartment;
		lineNumbers: Compartment;
	};
}

function createSideEditorState(): SideEditorState {
	return {
		view: null,
		container: null,
		compartments: {
			wordDiff: new Compartment(),
			foldGutter: new Compartment(),
			classification: new Compartment(),
			diffMarkerGutter: new Compartment(),
			lineNumbers: new Compartment(),
		},
	};
}

/** Pending parameter updates to be applied in batch */
interface PendingUpdate {
	wordWrap?: boolean;
	wordDiffMode?: "word" | "char" | "none";
	enableFolding?: boolean;
	showClassification?: boolean;
}

/** Pre-computed update data ready for dispatch */
interface ComputedUpdate {
	// Document changes (only if wordDiffMode changed)
	beforeContent?: string;
	afterContent?: string;

	// Line mappings (only if wordDiffMode changed)
	lineMap?: LineMapping[];
	blockLineRanges?: Map<string, { start: number; end: number }>;

	// Alignment lines (only if wordDiffMode changed)
	beforeLines?: string[];
	afterLines?: string[];

	// Effects to dispatch per side
	sideEffects: [StateEffect<unknown>[], StateEffect<unknown>[]];

	// Fold state to restore
	foldedBlockIds: Set<string>;

	// Side effects
	setupFoldSync?: boolean;
	teardownFoldSync?: boolean;
}

export class SideBySideView extends BaseView {
	private before: SideEditorState = createSideEditorState();
	private after: SideEditorState = createSideEditorState();
	private scrollSyncCleanup: (() => void) | null = null;
	private foldSyncCleanup: (() => void) | null = null;
	private heightSyncHandle: HeightSyncHandle | null = null;

	/** Batch update state */
	private pendingUpdate: PendingUpdate | null = null;
	private updateRafId: number | null = null;

	/** Stored alignment data for dynamic reconfiguration */
	private alignmentBeforeLines: string[] = [];
	private alignmentAfterLines: string[] = [];

	/** Stored diff data for incremental updates */
	private currentDiffData: DiffData | null = null;
	private currentFormat: "json" | "yaml" = "yaml";
	private currentBlockLineRanges: Map<string, { start: number; end: number }> = new Map();

	render(diffData: DiffData, format: "json" | "yaml"): void {
		// Clean up any existing editors
		this.destroyEditors();

		// Store diff data for incremental updates
		this.currentDiffData = diffData;
		this.currentFormat = format;

		// Create flex container
		this.rootEl.style.display = "flex";

		this.before.container = document.createElement("div");
		this.before.container.className = "cm-diff-side cm-diff-side-before";
		this.before.container.style.flex = "1";
		this.before.container.style.minWidth = "0";
		this.before.container.style.height = "100%";
		this.before.container.style.overflow = "hidden";
		this.before.container.style.borderRight = `1px solid ${this.config.dark ? "#30363d" : "#d0d7de"}`;
		this.rootEl.appendChild(this.before.container);

		this.after.container = document.createElement("div");
		this.after.container.className = "cm-diff-side cm-diff-side-after";
		this.after.container.style.flex = "1";
		this.after.container.style.minWidth = "0";
		this.after.container.style.height = "100%";
		this.after.container.style.overflow = "hidden";
		this.rootEl.appendChild(this.after.container);

		// Generate aligned content
		const alignment: AlignmentResult = generateAlignedContentFromDiff(diffData.blocks, format, {
			wordDiffMode: this.config.wordDiffMode,
		});

		// Store alignment data for dynamic reconfiguration
		this.alignmentBeforeLines = alignment.beforeLines;
		this.alignmentAfterLines = alignment.afterLines;
		this.currentBlockLineRanges = alignment.blockLineRanges;

		const showWordDiff = this.config.wordDiffMode !== "none";
		const diffMode = this.config.wordDiffMode === "none" ? undefined : this.config.wordDiffMode;

		// Create both editors
		for (const side of ["before", "after"] as const) {
			const sideState = this[side];
			const c = sideState.compartments;

			const wordDiffData = showWordDiff
				? buildWordDiffData(alignment.lineMap, alignment.beforeLines, alignment.afterLines, side, diffMode)
				: [];

			// Gutter order: classification → line numbers → fold gutter → diff marker
			const extensions = [
				...this.createBaseExtensions(format, side, alignment.lineMap),
				c.wordDiff.of(
					showWordDiff
						? [wordDiffPluginOnly(), wordDiffRequestor(alignment.beforeLines, alignment.afterLines, side, diffMode)]
						: []
				),
				c.classification.of(
					this.config.showClassification ? [...createClassificationGutter(alignment.lineMap, side), changeBadges()] : []
				),
				c.lineNumbers.of(createSpacerAwareLineNumbers(alignment.lineMap, side, this.config.wordDiffMode)),
				c.foldGutter.of(
					this.config.enableFolding
						? [foldGutter({ openText: "\u2304", closedText: "\u203A" }), keymap.of(diffFoldKeymap)]
						: []
				),
				c.diffMarkerGutter.of(createDiffMarkerGutter(alignment.lineMap, side, this.config.wordDiffMode)),
			];

			const content = side === "before" ? alignment.beforeLines.join("\n") : alignment.afterLines.join("\n");

			const state = EditorState.create({ doc: content, extensions });
			if (!sideState.container) continue;
			sideState.view = new EditorView({ state, parent: sideState.container });

			// Dispatch initial effects
			const effects: StateEffect<unknown>[] = [
				setSideEffect.of(side),
				setDiffDataEffect.of(diffData),
				setEditorSideEffect.of(side),
				setLineMappingsEffect.of(alignment.lineMap),
				setWordDiffModeEffect.of(this.config.wordDiffMode),
			];

			if (showWordDiff && wordDiffData.length > 0) {
				effects.push(setWordDiffDataEffect.of(wordDiffData));
			}

			sideState.view.dispatch({ effects });
		}

		// Set up scroll sync
		const beforeView = this.before.view;
		const afterView = this.after.view;
		if (!beforeView || !afterView) return;

		this.scrollSyncCleanup = this.setupScrollSync(beforeView, afterView);

		// Set up fold sync if enabled
		if (this.config.enableFolding) {
			this.foldSyncCleanup = setupFoldSync(beforeView, afterView, alignment.lineMap);
		}

		// Set up height sync to equalize line heights across editors
		this.heightSyncHandle = setupHeightSync(beforeView, afterView);
	}

	updateTheme(dark: boolean, colors?: Partial<DiffThemeColors>, baseTheme?: Extension): void {
		this.config.dark = dark;
		if (colors) this.config.colors = colors;
		if (baseTheme !== undefined) this.config.baseTheme = baseTheme;

		const opts = { dark, colors };
		if (this.before.view) {
			this.themeManager.setDiffTheme(this.before.view, opts);
		}
		if (this.after.view) {
			this.themeManager.setDiffTheme(this.after.view, opts);
		}

		// Update divider color
		if (this.before.container) {
			this.before.container.style.borderRight = `1px solid ${dark ? "#30363d" : "#d0d7de"}`;
		}
	}

	getEditorViews(): EditorView[] {
		const views: EditorView[] = [];
		if (this.before.view) views.push(this.before.view);
		if (this.after.view) views.push(this.after.view);
		return views;
	}

	destroy(): void {
		// Cancel any pending update
		if (this.updateRafId !== null) {
			cancelAnimationFrame(this.updateRafId);
			this.updateRafId = null;
		}
		this.pendingUpdate = null;

		this.destroyEditors();
		this.rootEl.remove();
	}

	private destroyEditors(): void {
		this.scrollSyncCleanup?.();
		this.scrollSyncCleanup = null;
		this.foldSyncCleanup?.();
		this.foldSyncCleanup = null;
		this.heightSyncHandle?.destroy();
		this.heightSyncHandle = null;
		this.before.view?.destroy();
		this.before.view = null;
		this.after.view?.destroy();
		this.after.view = null;

		// Clear containers
		while (this.rootEl.firstChild) {
			this.rootEl.removeChild(this.rootEl.firstChild);
		}
		this.before.container = null;
		this.after.container = null;
	}

	// ─────────────────────────────────────────────────────────────────
	// Public setters - queue changes instead of applying immediately
	// ─────────────────────────────────────────────────────────────────

	setWordWrap(enabled: boolean): void {
		if (this.config.wordWrap === enabled) return;
		this.queueUpdate({ wordWrap: enabled });
	}

	setFoldingEnabled(enabled: boolean): void {
		if (this.config.enableFolding === enabled) return;
		this.queueUpdate({ enableFolding: enabled });
	}

	setClassificationEnabled(enabled: boolean): void {
		if (this.config.showClassification === enabled) return;
		this.queueUpdate({ showClassification: enabled });
	}

	setWordDiffMode(mode: "word" | "char" | "none"): void {
		if (this.config.wordDiffMode === mode) return;
		this.queueUpdate({ wordDiffMode: mode });
	}

	// ─────────────────────────────────────────────────────────────────
	// Queue and schedule mechanism
	// ─────────────────────────────────────────────────────────────────

	private queueUpdate(update: Partial<PendingUpdate>): void {
		// Merge with any existing pending updates
		this.pendingUpdate = { ...this.pendingUpdate, ...update };

		// Schedule RAF if not already scheduled
		if (this.updateRafId === null) {
			this.updateRafId = requestAnimationFrame(() => {
				this.updateRafId = null;
				this.applyPendingUpdates();
			});
		}
	}

	// ─────────────────────────────────────────────────────────────────
	// Compute all changes (pure computation, no DOM)
	// ─────────────────────────────────────────────────────────────────

	private computeUpdates(updates: PendingUpdate): ComputedUpdate {
		const result: ComputedUpdate = {
			sideEffects: [[], []],
			foldedBlockIds: new Set(),
		};

		if (!this.before.view || !this.after.view) return result;

		// Save fold state BEFORE any changes
		result.foldedBlockIds = extractFoldedBlockIds(this.before.view, this.currentLineMap);

		// Track if we need new alignment (wordDiffMode changes document structure)
		let alignment: AlignmentResult | null = null;

		// ── Process wordDiffMode first (changes document structure) ──
		if (updates.wordDiffMode !== undefined && this.currentDiffData) {
			alignment = generateAlignedContentFromDiff(this.currentDiffData.blocks, this.currentFormat, {
				wordDiffMode: updates.wordDiffMode,
			});

			result.beforeContent = alignment.beforeLines.join("\n");
			result.afterContent = alignment.afterLines.join("\n");
			result.lineMap = alignment.lineMap;
			result.blockLineRanges = alignment.blockLineRanges;
			result.beforeLines = alignment.beforeLines;
			result.afterLines = alignment.afterLines;

			const mode = updates.wordDiffMode;
			const showWordDiff = mode !== "none";
			const diffMode = mode === "none" ? undefined : mode;

			const sides = [this.before, this.after] as const;
			const sideNames = ["before", "after"] as const;

			for (let si = 0; si < 2; si++) {
				const c = sides[si].compartments;
				const sideName = sideNames[si];
				const effects = result.sideEffects[si];

				effects.push(setLineMappingsEffect.of(alignment.lineMap));
				effects.push(setWordDiffModeEffect.of(mode));
				effects.push(c.diffMarkerGutter.reconfigure(createDiffMarkerGutter(alignment.lineMap, sideName, mode)));
				effects.push(c.lineNumbers.reconfigure(createSpacerAwareLineNumbers(alignment.lineMap, sideName, mode)));

				const wordDiffExt = showWordDiff
					? [wordDiffPluginOnly(), wordDiffRequestor(alignment.beforeLines, alignment.afterLines, sideName, diffMode)]
					: [];
				effects.push(c.wordDiff.reconfigure(wordDiffExt));

				if (showWordDiff) {
					const wordDiffData = buildWordDiffData(
						alignment.lineMap,
						alignment.beforeLines,
						alignment.afterLines,
						sideName,
						diffMode
					);
					if (wordDiffData.length > 0) {
						effects.push(setWordDiffDataEffect.of(wordDiffData));
					}
				}
			}
		}

		// ── Process wordWrap ──
		if (updates.wordWrap !== undefined) {
			const ext = updates.wordWrap ? EditorView.lineWrapping : [];
			for (let si = 0; si < 2; si++) {
				result.sideEffects[si].push(this.lineWrappingCompartment.reconfigure(ext));
			}
		}

		// ── Process enableFolding ──
		if (updates.enableFolding !== undefined) {
			const foldExt = updates.enableFolding
				? [foldGutter({ openText: "\u2304", closedText: "\u203A" }), keymap.of(diffFoldKeymap)]
				: [];
			result.sideEffects[0].push(this.before.compartments.foldGutter.reconfigure(foldExt));
			result.sideEffects[1].push(this.after.compartments.foldGutter.reconfigure(foldExt));

			// Track fold sync lifecycle changes
			if (updates.enableFolding && !this.foldSyncCleanup) {
				result.setupFoldSync = true;
			} else if (!updates.enableFolding && this.foldSyncCleanup) {
				result.teardownFoldSync = true;
			}
		}

		// ── Process showClassification ──
		if (updates.showClassification !== undefined) {
			const lineMap = result.lineMap || this.currentLineMap;
			const sides = [this.before, this.after] as const;
			const sideNames = ["before", "after"] as const;

			for (let si = 0; si < 2; si++) {
				const classExt = updates.showClassification
					? [...createClassificationGutter(lineMap, sideNames[si]), changeBadges()]
					: [];
				result.sideEffects[si].push(sides[si].compartments.classification.reconfigure(classExt));
			}
		}

		return result;
	}

	// ─────────────────────────────────────────────────────────────────
	// Apply all changes (DOM mutations) with Hidden Measurement
	// ─────────────────────────────────────────────────────────────────

	private applyPendingUpdates(): void {
		const updates = this.pendingUpdate;
		if (!updates || !this.before.view || !this.after.view) {
			this.pendingUpdate = null;
			return;
		}
		this.pendingUpdate = null;

		const beforeDom = this.before.view.dom;
		const afterDom = this.after.view.dom;

		// Compute all changes
		const computed = this.computeUpdates(updates);

		// Check if document structure is changing (wordDiffMode change)
		const documentChanging = computed.beforeContent !== undefined;

		// Only use hidden measurement technique when document structure changes
		if (documentChanging) {
			beforeDom.style.visibility = "hidden";
			afterDom.style.visibility = "hidden";
		}

		try {
			// Update config values
			if (updates.wordWrap !== undefined) this.config.wordWrap = updates.wordWrap;
			if (updates.wordDiffMode !== undefined) this.config.wordDiffMode = updates.wordDiffMode;
			if (updates.enableFolding !== undefined) this.config.enableFolding = updates.enableFolding;
			if (updates.showClassification !== undefined) this.config.showClassification = updates.showClassification;

			// Update stored alignment data if changed
			if (computed.lineMap) {
				this.currentLineMap = computed.lineMap;
				if (computed.blockLineRanges) this.currentBlockLineRanges = computed.blockLineRanges;
			}
			if (computed.beforeLines) {
				this.alignmentBeforeLines = computed.beforeLines;
			}
			if (computed.afterLines) {
				this.alignmentAfterLines = computed.afterLines;
			}

			// Dispatch to both views
			const views = [this.before.view, this.after.view];
			const contents = [computed.beforeContent, computed.afterContent];

			for (let si = 0; si < 2; si++) {
				const view = views[si];
				const effects = documentChanging
					? [...computed.sideEffects[si], setHeightPaddingEffect.of([])]
					: computed.sideEffects[si];

				view.dispatch({
					changes:
						contents[si] !== undefined ? { from: 0, to: view.state.doc.length, insert: contents[si] } : undefined,
					effects,
				});
			}

			// Handle fold sync lifecycle
			if (computed.teardownFoldSync && this.foldSyncCleanup) {
				this.foldSyncCleanup();
				this.foldSyncCleanup = null;
			}
			if (computed.setupFoldSync && this.before.view && this.after.view) {
				this.foldSyncCleanup = setupFoldSync(this.before.view, this.after.view, this.currentLineMap);
			}

			// Restore folds if document structure changed
			if (computed.blockLineRanges && this.before.view && this.after.view) {
				restoreFoldsFromBlockIds(this.before.view, computed.foldedBlockIds, computed.blockLineRanges);
				restoreFoldsFromBlockIds(this.after.view, computed.foldedBlockIds, computed.blockLineRanges);
			}

			// Force layout and measure heights
			if (documentChanging) {
				void beforeDom.offsetHeight;
				void afterDom.offsetHeight;
				this.heightSyncHandle?.reEqualize();
				void beforeDom.offsetHeight;
				void afterDom.offsetHeight;
				this.heightSyncHandle?.reEqualize();
			} else {
				this.heightSyncHandle?.reEqualize();
			}
		} finally {
			if (documentChanging) {
				beforeDom.style.visibility = "";
				afterDom.style.visibility = "";
			}
		}
	}

	private setupScrollSync(beforeView: EditorView, afterView: EditorView): () => void {
		let syncEnabled = true;

		const syncScroll = (source: EditorView, target: EditorView) => {
			if (!syncEnabled) return;

			syncEnabled = false;
			target.scrollDOM.scrollTop = source.scrollDOM.scrollTop;

			requestAnimationFrame(() => {
				syncEnabled = true;
			});
		};

		const beforeScrollHandler = () => syncScroll(beforeView, afterView);
		const afterScrollHandler = () => syncScroll(afterView, beforeView);

		beforeView.scrollDOM.addEventListener("scroll", beforeScrollHandler);
		afterView.scrollDOM.addEventListener("scroll", afterScrollHandler);

		return () => {
			beforeView.scrollDOM.removeEventListener("scroll", beforeScrollHandler);
			afterView.scrollDOM.removeEventListener("scroll", afterScrollHandler);
		};
	}
}
