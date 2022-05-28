import React, { useContext } from "react"
import styled from "styled-components"

import { CustomItemProps, NavigationGroup } from "./NavigationGroup"
import { NavContext } from "../helpers/nav.context"
import { NavigationItem } from "./NavigationItem"
import { getPathValue } from "../utils"

const methodColor = (method: string) => {
  switch (method) {
    case "get": return "#48bb78"
    case "post": return "#008eff"
    case "put": return "#ed8936"
    case "delete": return "#f56565"
    default: return "#ed8936"
  }
}

const StyledMethod = styled.span<{method: string}>`
  cursor: pointer;
  font-size: 12px;
  opacity: .75;
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({ method}) => methodColor(method)};
  border: none;
  border-radius: 3px;
  line-height: 12px;
  max-width: 100%;
  min-height: 16px;
  min-width: 16px;
  padding: 0px 6px;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: white;
`

export interface ApiNavigationeProps {
  /**
   * Api document
   */
  data: any
  /**
   * navigation method
   */
  navigate: (id: string) => void
}

export const OpenApi3Navigation = () => {
  const { data } = useContext(NavContext)
  const nav = []

  const openApiPaths = [["info"], ["externalDocs"], ["servers"], ["tags"]]
  nav.push(<NavigationGroup paths={openApiPaths} key="openapi" name="OpenAPI" />)

  const methodPaths = Object.keys(data?.paths || {}).map((key) => ["paths", key])
  const pathItem = ({ id, path, navigate }: CustomItemProps) => {
    const methods = []
    for (const op in getPathValue(data, path)) {
      methods.push(<StyledMethod key={`${id}/${op}`} method={op} onClick={() => navigate && navigate(`${id}/${op}`)}>{op.toLocaleUpperCase()}</StyledMethod>)
    }
    const name = path[path.length - 1].replaceAll(new RegExp("\{(.*?)\}", "ig"), "}\u25CF{").split("").reverse().join("")
    return <NavigationItem id={id} name={name} onClick={() => navigate && navigate(id)}>{methods}</NavigationItem>
  }
  nav.push(<NavigationGroup paths={methodPaths} key="paths" name="Paths" CustomItem={pathItem}/>)
  
  nav.push(...["schemas", "responses", "parameters", "examples", "requestBodies", "headers", "securitySchemes", "links", "callbacks"].map((key) => {
    const name = key.replace(/([A-Z])/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase()).trim()
    const paths = Object.keys(data?.components?.[key] || {}).map((n) => ["components", key, n])
    return <NavigationGroup paths={paths} key={`components/${key}`} name={name} />
  }))

  return <>{nav}</  >
}

export const AsyncApi3Navigation = () => {
  const { data } = useContext(NavContext)
  const nav = []

  const openApiPaths = [["info"], ["externalDocs"], ["servers"], ["tags"]]
  nav.push(<NavigationGroup paths={openApiPaths} key="asyncapi" name="AsyncAPI" />)

  const methodPaths = Object.keys(data?.channels || {}).map((key) => ["channels", key])
  const pathItem = ({ id, path, navigate }: CustomItemProps) => {
    const name = path[path.length - 1].replaceAll(new RegExp("\{(.*?)\}", "ig"), "}\u25CF{").split("").reverse().join("")
    return <NavigationItem id={id} name={name} onClick={() => navigate && navigate(id)} />
  }
  nav.push(<NavigationGroup paths={methodPaths} key="channels" name="Channels" CustomItem={pathItem}/>)
  
  nav.push(...["schemas", "responses", "parameters", "examples", "requestBodies", "headers", "securitySchemes", "links", "callbacks"].map((key) => {
    const name = key.replace(/([A-Z])/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase()).trim()
    const paths = Object.keys(data?.components?.[key] || {}).map((n) => ["components", key, n])
    return <NavigationGroup paths={paths} key={`components/${key}`} name={name} />
  }))

  return <>{nav}</>
}

export const JsonNavigation = () => {
  const { data } = useContext(NavContext)
  const nav = []

  for(const key of Object.keys(data || {})) {
    if (typeof data[key] !== "object") { continue }
    const paths = Object.keys(data[key] || {}).map((n) => [key, n])
    nav.push(<NavigationGroup key={key} paths={paths} name={key} />)
  }

  return <>{nav}</>
}

export const ApiNavigation = ({ data, navigate }: ApiNavigationeProps) => {

  const selectNavigationComponent = (data: any) => {
    if (/3.+/.test(data.openapi || "")) { return OpenApi3Navigation }
    if (/2.+/.test(data.asyncapi || "")) { return AsyncApi3Navigation }
    return JsonNavigation
  }

  const NavigationComponent = selectNavigationComponent(data)

  return (
    <NavContext.Provider value={{ navigate, data }}>
      { NavigationComponent && <NavigationComponent /> }
    </NavContext.Provider>
  )
}