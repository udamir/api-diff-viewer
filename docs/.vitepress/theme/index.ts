import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";

import "./style.css";

// the demo components are imported by the demo page only, so the guide pages do not load the viewer
export default {
	extends: DefaultTheme,
} satisfies Theme;
