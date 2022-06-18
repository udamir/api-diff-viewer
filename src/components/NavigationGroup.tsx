import React, { useContext, useState } from "react"
import "./NavigationGroup.css"

import { NavContext } from "../helpers/nav.context"
import { encodeKey, getPathValue } from "../utils"
import { NavigationItem } from "./NavigationItem"


export interface CustomItemProps {
  id: string
  path: string[]
  active?: boolean
  onClick?: () => void
}

export interface NavigationGroupProps {
  paths: string[][]
  name: string
  CustomItem?: (props: CustomItemProps) => JSX.Element
}

export const NavigationGroup = ({ paths, name, CustomItem }: NavigationGroupProps) => {
  const [ collapsed, setCollapsed ] = useState(false)
  const { data, onNavigate, selected } = useContext(NavContext)

  const items = []

  for (const path of paths) {
    if (getPathValue(data, path) === undefined) { continue }
    const itemId = path.map(encodeKey).join("/")
    const active = itemId === selected

    const onClick = () => onNavigate && onNavigate(itemId)
    if (CustomItem) {
      items.push(<CustomItem key={itemId} id={itemId} active={active} path={path} onClick={onClick} />)
    } else {
      const name = `- ${path.slice(-1).pop()}`.split("").reverse().join("")
      items.push(<NavigationItem key={itemId} id={itemId} active={active} name={name} onClick={onClick} />)
    }
  }

  if (items.length) {
    return (
      <div>
        <div className="navigation-group" key={name} onClick={() => setCollapsed(!collapsed)}>
          <span className={`group-toggle${collapsed ? " collapsed" : ""}`} onClick={() => setCollapsed(!collapsed)}></span>
          <span className="group-name">{name}</span>
        </div>
        { !collapsed && items }
      </div>
    )
  }
  return <div />
}
