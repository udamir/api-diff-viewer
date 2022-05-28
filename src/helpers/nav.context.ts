import { createContext } from "react";

export type NavContextProps = {
  /**
   * api document
   */
  data?: any
  /**
   * Navigation method
   */
  navigate?: (id: string) => void
}

export const NavContext = createContext<NavContextProps>({})