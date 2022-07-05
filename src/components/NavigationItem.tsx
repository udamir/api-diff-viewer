import React from "react"
import "./NavigationItem.css"

export interface NavigationItemProps {
  id: string
  name: string
  onClick?: () => void
  active?: boolean
  change?: string
  children?: React.ReactNode
}

export const NavigationItem = ({ name, onClick, children, change, active }: NavigationItemProps) => {
  return (
    <div className={`navigation-ref${active ? " active" : ""}${change ? " " + change : ""}`} onClick={onClick}>
      <div className="navigation-path">{name}</div>
      { children }
    </div>
  )
}
