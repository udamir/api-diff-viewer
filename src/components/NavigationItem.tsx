import React from "react"
import "./NavigationItem.css"

export interface NavigationItemProps {
  id: string
  name: string
  onClick?: () => void
  active?: boolean
  children?: React.ReactNode
}

export const NavigationItem = ({ name, onClick, children, active }: NavigationItemProps) => {
  return (
    <div className={`navigation-ref${active ? " active" : ""}`} onClick={onClick}>
      <div className="navigation-path">{name}</div>
      { children }
    </div>
  )
}
