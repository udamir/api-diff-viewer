import { createContext } from "react";

export type NavContextProps = {
  /**
   * api document
   */
  data?: any
  /**
   * diff metaKey
   */
  diffMetaKey?: any
  /**
   * current selected item
   */
  selected?: string
  /**
   * Navigation method
   */
  onNavigate?: (id: string) => void
}

export const NavContext = createContext<NavContextProps>({})