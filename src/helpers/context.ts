import { DiffType } from "api-smart-diff";
import { createContext } from "react";

export type DiffContextProps = {
  /**
   * Treeview parameters
   */
  treeview?: "expanded" | "collapsed" | "filtered"
  /**
   * Change filters
   */
  filters?: DiffType[]
  /**
   * Display document diff in inline or side-by-side mode
   */
  display?: "inline" | "side-by-side"
}

export const DiffContext = createContext<DiffContextProps>({})
