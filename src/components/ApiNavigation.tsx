import React, { CSSProperties, useContext, useState } from "react"
import "./ApiNavigation.css"

import { CustomItemProps, NavigationGroup } from "./NavigationGroup"
import { NavContext } from "../helpers/nav.context"
import { NavigationItem } from "./NavigationItem"
import { metaKey } from "../diff-builder/common"
import { getPathValue } from "../utils"
import { defaultThemes, Theme } from "../theme"

export interface ApiNavigationeProps {
  /**
   * Api document
   */
  data: any
  /**
   * Diff metaKey
   */
  diffMetaKey?: any
  /**
   * current theme
   */
  theme?: Theme
  /**
   * navigation method
   */
  onNavigate?: (id: string) => void
}

export const OpenApi3Navigation = () => {
  const { data, diffMetaKey, selected, onNavigate } = useContext(NavContext)
  const nav = []

  const openApiPaths = [["info"], ["externalDocs"], ["servers"], ["tags"]]
  nav.push(<NavigationGroup paths={openApiPaths} key="openapi" name="OpenAPI" />)

  const { [diffMetaKey]: diff, ...rest } = data?.paths || {}
  const methodPaths = Object.keys(rest).filter((n) => n !== diffMetaKey).map((key) => ["paths", key])
  const pathItem = ({ id, path, active, onClick }: CustomItemProps) => {
    const methods = []
    let activeMethod = false
    for (const op in getPathValue(data, path)) {
      if (!["get", "post", "delete", "put", "patch", "head", "trace", "options"].includes(op.toLocaleLowerCase())) { continue }
      activeMethod = activeMethod || `${id}/${op}` === selected
      const onClick: React.MouseEventHandler = (event) => {
        event.stopPropagation()
        onNavigate && onNavigate(`${id}/${op}`)
      }
      methods.push(<div className={`method ${op}`} key={`${id}/${op}`} onClick={onClick}>{op.toLocaleUpperCase()}</div>)
    }
    const name = path[path.length - 1].replaceAll(new RegExp("\{(.*?)\}", "ig"), "}\u25CF{").split("").reverse().join("")
    return <NavigationItem id={id} name={name} active={active || activeMethod} onClick={onClick}>{methods}</NavigationItem>
  }
  nav.push(<NavigationGroup paths={methodPaths} key="paths" name="Paths" CustomItem={pathItem}/>)
  
  nav.push(...["schemas", "responses", "parameters", "examples", "requestBodies", "headers", "securitySchemes", "links", "callbacks"].map((key) => {
    const name = key.replace(/([A-Z])/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase()).trim()
    const paths = Object.keys(data?.components?.[key] || {}).filter((n) => n !== diffMetaKey).map((n) => ["components", key, n])
    return <NavigationGroup paths={paths} key={`components/${key}`} name={name} />
  }))

  return <>{nav}</  >
}

export const AsyncApi3Navigation = () => {
  const { data, diffMetaKey } = useContext(NavContext)
  const nav = []

  const openApiPaths = [["info"], ["externalDocs"], ["servers"], ["tags"]]
  nav.push(<NavigationGroup paths={openApiPaths} key="asyncapi" name="AsyncAPI" />)

  const { [diffMetaKey]: diff, ...rest } = data?.channels || {}
  const channelPaths = Object.keys(rest).filter((n) => n !== diffMetaKey).map((key) => ["channels", key])
  const pathItem = ({ id, path, active, onClick }: CustomItemProps) => {
    const name = path[path.length - 1].replaceAll(new RegExp("\{(.*?)\}", "ig"), "}\u25CF{").split("").reverse().join("")
    return <NavigationItem id={id} active={active} name={name} onClick={onClick} />
  }
  nav.push(<NavigationGroup paths={channelPaths} key="channels" name="Channels" CustomItem={pathItem}/>)
  
  nav.push(...["schemas", "responses", "parameters", "examples", "requestBodies", "headers", "securitySchemes", "links", "callbacks"].map((key) => {
    const name = key.replace(/([A-Z])/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase()).trim()
    const paths = Object.keys(data?.components?.[key] || {}).filter((n) => n !== diffMetaKey).map((n) => ["components", key, n])
    return <NavigationGroup paths={paths} key={`components/${key}`} name={name} />
  }))

  return <>{nav}</>
}

export const JsonNavigation = () => {
  const { data, diffMetaKey } = useContext(NavContext)
  const nav = []

  for(const key of Object.keys(data || {})) {
    if (typeof data[key] !== "object" || key === diffMetaKey) { continue }
    const paths = Object.keys(data[key] || {}).filter((n) => n !== diffMetaKey).map((n) => [key, n])
    nav.push(<NavigationGroup key={key} paths={paths} name={key} />)
  }

  return <>{nav}</>
}

export const ApiNavigation = ({ data, diffMetaKey = metaKey, theme = defaultThemes.default, onNavigate }: ApiNavigationeProps) => {
  const [selected, setSelected] = useState("")

  const selectNavigationComponent = (data: any) => {
    if (/3.+/.test(data?.openapi || "")) { return OpenApi3Navigation }
    if (/2.+/.test(data?.asyncapi || "")) { return AsyncApi3Navigation }
    return JsonNavigation
  }

  const NavigationComponent = selectNavigationComponent(data)


  const navigate = (id: string) => {
    onNavigate && onNavigate(id)
    setSelected(id)
  }

  return (
    <NavContext.Provider value={{ onNavigate: navigate, selected, diffMetaKey, data }}>
      <div id="api-navigation" style={theme as CSSProperties}>
        { NavigationComponent && <NavigationComponent /> }
      </div>
    </NavContext.Provider>
  )
}
