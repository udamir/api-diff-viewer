import { DiffType } from "api-smart-diff";
import { createContext, Dispatch, SetStateAction } from "react";
import { defaultTheme, Theme } from "../themes";

export type DiffContextProps = {
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
  theme: Theme,
  /**
   * Expand all blocks
   */
  expandAll?: () => void
  /**
   * Collapse all blocks
   */
  collapseAll?: () => void
  /**
   * Navigate to id
   */
  navigateTo?: (id: string) => void
  /**
   * Theme select function
   */
  setCurrentTheme?: Dispatch<SetStateAction<string>>
}

export const DiffContext = createContext<DiffContextProps>({
  treeview: 'expanded',
  display: "side-by-side",
  themeType: 'default',
  theme: defaultTheme,
})
