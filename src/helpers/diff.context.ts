import { DiffType } from "api-smart-diff";
import { createContext, Dispatch, SetStateAction } from "react";
import { defaultThemes, Theme } from "../theme";

export type DiffContextProps = {
  /**
   * Merged API document
   */
  data?: any
  /**
   * Treeview parameters
   */
  treeview?: "expanded" | "collapsed"
  /**
   * Change filters
   */
  filters?: DiffType[]
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
  /**
   * Selected id
   */
  selected?: string
  /**
   * Selected theme type
   */
  themeType?: string;
  /**
   * Selected theme
   */
  theme?: Theme,
  /**
   * Text selection side
   */
  textSelectionSide?: "before" | "after", 
  /**
   * Set text selection side
   */
  setTextSelectionSide?: (side?: "before" | "after") => void
  /**
   * Expand all blocks
   */
  expandAll?: () => void
  /**
   * Collapse all blocks
   */
  collapseAll?: () => void
  /**
   * Scroll to id in parent element, default window
   */
  navigateTo?: (id: string, parent?: HTMLElement | Window) => void
  /**
   * Theme select function
   */
  setCurrentTheme?: Dispatch<SetStateAction<string>>
}

export const DiffContext = createContext<DiffContextProps>({
  treeview: 'expanded',
  display: "side-by-side",
  themeType: 'default',
  theme: defaultThemes.default,
})
