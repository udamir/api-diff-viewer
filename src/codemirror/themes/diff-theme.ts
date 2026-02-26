import { Compartment, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { DiffThemeColors } from "../types";

/** Compartment for dynamic theme switching */
export const themeCompartment = new Compartment();

/** Default light theme colors */
const lightColors: Required<DiffThemeColors> = {
	addedBg: "rgba(46, 160, 67, 0.15)",
	removedBg: "rgba(248, 81, 73, 0.15)",
	modifiedBg: "rgba(227, 179, 65, 0.15)",
	breakingColor: "#cf222e",
	nonBreakingColor: "#1a7f37",
	annotationColor: "#8250df",
	unclassifiedColor: "#656d76",
	addedTextBg: "rgba(46, 160, 67, 0.4)",
	removedTextBg: "rgba(248, 81, 73, 0.4)",
	spacerBg: "#f6f8fa",
	spacerStripe: "#e1e4e8",
	correspondingHighlight: "rgba(56, 139, 253, 0.15)",
};

/** Default dark theme colors */
const darkColors: Required<DiffThemeColors> = {
	addedBg: "rgba(46, 160, 67, 0.2)",
	removedBg: "rgba(248, 81, 73, 0.2)",
	modifiedBg: "rgba(227, 179, 65, 0.2)",
	breakingColor: "#f85149",
	nonBreakingColor: "#3fb950",
	annotationColor: "#a371f7",
	unclassifiedColor: "#768390",
	addedTextBg: "rgba(46, 160, 67, 0.5)",
	removedTextBg: "rgba(248, 81, 73, 0.5)",
	spacerBg: "#161b22",
	spacerStripe: "#30363d",
	correspondingHighlight: "rgba(56, 139, 253, 0.2)",
};

/** Create CSS variable declarations from theme colors */
function createCssVars(colors: Required<DiffThemeColors>): Record<string, string> {
	return {
		"--diff-added-bg": colors.addedBg,
		"--diff-removed-bg": colors.removedBg,
		"--diff-modified-bg": colors.modifiedBg,
		"--diff-breaking-color": colors.breakingColor,
		"--diff-non-breaking-color": colors.nonBreakingColor,
		"--diff-annotation-color": colors.annotationColor,
		"--diff-unclassified-color": colors.unclassifiedColor,
		"--diff-added-text-bg": colors.addedTextBg,
		"--diff-removed-text-bg": colors.removedTextBg,
		"--diff-spacer-bg": colors.spacerBg,
		"--diff-spacer-stripe": colors.spacerStripe,
		"--diff-corresponding-highlight": colors.correspondingHighlight,
	};
}

/** Light theme extension */
export const diffThemeLight = EditorView.theme(
	{
		"&": createCssVars(lightColors),
		".cm-content": {
			fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
			fontSize: "13px",
			lineHeight: "1.5",
		},
		".cm-gutters": {
			backgroundColor: "#f6f8fa",
			borderRight: "1px solid #d0d7de",
			color: "#656d76",
		},
		".cm-lineNumbers .cm-gutterElement": {
			padding: "0 8px 0 16px",
			minWidth: "48px",
		},
		".cm-activeLine": {
			backgroundColor: "rgba(234, 238, 242, 0.5)",
		},
		".cm-activeLineGutter": {
			backgroundColor: "#eaeef2",
		},
	},
	{ dark: false }
);

/** Dark theme extension */
export const diffThemeDark = EditorView.theme(
	{
		"&": createCssVars(darkColors),
		".cm-content": {
			fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
			fontSize: "13px",
			lineHeight: "1.5",
		},
		".cm-gutters": {
			backgroundColor: "#161b22",
			borderRight: "1px solid #30363d",
			color: "#768390",
		},
		".cm-lineNumbers .cm-gutterElement": {
			padding: "0 8px 0 16px",
			minWidth: "48px",
		},
		".cm-activeLine": {
			backgroundColor: "rgba(56, 139, 253, 0.1)",
		},
		".cm-activeLineGutter": {
			backgroundColor: "#1c2128",
		},
	},
	{ dark: true }
);

/** Create diff theme extension with optional color overrides */
export function diffTheme(options?: { dark?: boolean; colors?: Partial<DiffThemeColors> }): Extension {
	const { dark = false, colors = {} } = options || {};
	const baseColors = dark ? darkColors : lightColors;
	const mergedColors = { ...baseColors, ...colors } as Required<DiffThemeColors>;

	return EditorView.theme(
		{
			"&": createCssVars(mergedColors),
			".cm-content": {
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
				fontSize: "13px",
				lineHeight: "1.5",
			},
			".cm-gutters": {
				backgroundColor: dark ? "#161b22" : "#f6f8fa",
				borderRight: `1px solid ${dark ? "#30363d" : "#d0d7de"}`,
				color: dark ? "#768390" : "#656d76",
			},
			".cm-lineNumbers .cm-gutterElement": {
				padding: "0 8px 0 16px",
				minWidth: "48px",
			},
			".cm-activeLine": {
				backgroundColor: dark ? "rgba(56, 139, 253, 0.1)" : "rgba(234, 238, 242, 0.5)",
			},
			".cm-activeLineGutter": {
				backgroundColor: dark ? "#1c2128" : "#eaeef2",
			},
		},
		{ dark }
	);
}

/** Detect if the current view is using dark mode */
export function detectDarkMode(view: EditorView): boolean {
	const root = view.dom.closest("[data-theme]");
	if (root) {
		return root.getAttribute("data-theme") === "dark";
	}

	// Check prefers-color-scheme
	if (typeof window !== "undefined") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}

	return false;
}

/** Theme manager for runtime theme switching */
export class DiffThemeManager {
	private compartment = new Compartment();

	/** Get extensions for initial setup */
	getExtensions(baseTheme?: Extension, diffColors?: Partial<DiffThemeColors>, dark?: boolean): Extension[] {
		const extensions: Extension[] = [];

		if (baseTheme) {
			extensions.push(baseTheme);
		}

		const theme = diffTheme({ dark, colors: diffColors });
		extensions.push(this.compartment.of(theme));

		return extensions;
	}

	/** Update diff theme at runtime */
	setDiffTheme(view: EditorView, options: { dark?: boolean; colors?: Partial<DiffThemeColors> }): void {
		const newTheme = diffTheme(options);

		view.dispatch({
			effects: this.compartment.reconfigure(newTheme),
		});
	}
}

export { lightColors, darkColors };
