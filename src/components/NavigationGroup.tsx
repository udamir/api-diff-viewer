import React, { useContext, useState } from "react"
import "./NavigationGroup.css"

import { NavContext } from "../helpers/nav.context"
import { encodeKey, getPathValue } from "../utils"
import { NavigationItem } from "./NavigationItem"


export interface CustomItemProps {
  id: string
  path: string[]
  active?: boolean
  change?: string
  onClick?: () => void
}

export interface NavigationGroupProps {
  paths: string[][]
  name: string
  CustomItem?: (props: CustomItemProps) => JSX.Element
}

const isModified = (obj: any, diffKey: any) => {
  if (typeof obj !== "object" || obj === null) { return false }

  const { [diffKey]: diff, ...rest } = obj
  if (diff) { return true }
  
  for (const key in rest) {
    const res = isModified(rest[key], diffKey)
    if (res) { return true }
  }

  return false
}

const getPathChange = (path: string[]) => {
  const { data, diffMetaKey } = useContext(NavContext)
  path = path.slice(0)
  const key = path.pop() 
  const { [diffMetaKey]: diff, ...rest } = getPathValue(data, path) || {}

  if (key && diff && diff[key]) {
    return diff[key].action
  } else {
    return key && isModified(rest[key], diffMetaKey) ? "replace" : ""
  }
}

export const NavigationGroup = ({ paths, name, CustomItem }: NavigationGroupProps) => {
  const [ collapsed, setCollapsed ] = useState(false)
  const { data, onNavigate, selected } = useContext(NavContext)

  const items = []

  for (const path of paths) {
    const value = getPathValue(data, path)
    if (value === undefined) { continue }
    const change = getPathChange(path)
    const itemId = path.map(encodeKey).join("/")
    const active = itemId === selected

    const onClick = () => onNavigate && onNavigate(itemId)
    if (CustomItem) {
      items.push(<CustomItem key={itemId} id={itemId} active={active} change={change} path={path} onClick={onClick} />)
    } else {
      const name = `- ${path.slice(-1).pop()}`.split("").reverse().join("")
      items.push(<NavigationItem key={itemId} id={itemId} active={active} change={change} name={name} onClick={onClick} />)
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
