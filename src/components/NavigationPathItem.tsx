import React, { useContext } from "react"
import { NavContext } from "../helpers/nav.context"
import { getPathValue } from "../utils"
import { CustomItemProps } from "./NavigationGroup"
import { NavigationItem } from "./NavigationItem"

export const NavigationPathItem = ({ id, path, change, active, onClick }: CustomItemProps) => {
  const { data, selected, onNavigate } = useContext(NavContext)
  
  const methods = []
  let activeMethod = false
  for (const op in getPathValue(data, path)) {
    if (!["get", "post", "delete", "put", "patch", "head", "trace", "options"].includes(op.toLocaleLowerCase())) { continue }
    activeMethod = activeMethod || `${id}/${op}` === selected
    const onClick: React.MouseEventHandler = (event) => {
      event.stopPropagation()
      onNavigate && onNavigate(`${id}/${op}`)
    }
    methods.push(<div className={`api-method ${op}`} key={`${id}/${op}`} onClick={onClick}>{op.toLocaleUpperCase()}</div>)
  }
  const name = path[path.length - 1].replaceAll(new RegExp("\{(.*?)\}", "ig"), "\u2022").split("").reverse().join("")
  return <NavigationItem id={id} name={name} change={change} active={active || activeMethod} onClick={onClick}>{methods}</NavigationItem>
}
