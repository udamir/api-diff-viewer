import React, { useContext } from "react"
import styled from "styled-components"
import { encodeKey } from "../diff-builder/common"
import { DiffContext } from "../helpers/context"

const StyledApiNavigation = styled.div`
  position: fixed;
  overflow-y: auto;
  top: 0px;
  bottom: 0px;
  width: inherit;
`

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

const StyledNavRef = styled.span`
  cursor: pointer;
  white-space: nowrap;
  color: #ebf1f5;
  overflow: hidden;
`

const StyledPath = styled.div`
  unicode-bidi: bidi-override;
  overflow: hidden;
  text-align: left;
  direction: rtl;
  white-space: nowrap;
  font-size: 12px;
  color: black;
  text-overflow: ellipsis;
  padding: 5px 0;
`

const StyledNavigationGroup = styled.div`
  padding-bottom: 10px;
  padding-top: 20px;
  font-weight: bolder;
`

export interface ApiNavigationeProps {
  /**
   * Line data
   */
  data: any
}



export const NavApiNavigation = ({ data }: ApiNavigationeProps) => {
  
  const { navigate } = useContext(DiffContext)

  const selectAnchor = (id: string) => {
    const block = document.getElementById(id)!
    const y = block.getBoundingClientRect().top + window.pageYOffset - 150;
    window.scrollTo({top: y, behavior: 'smooth'});
    navigate && navigate(id)
  }

  const nav = []
  
  if (/3.+/.test(data.openapi || "")) {
    nav.push(<StyledNavigationGroup key={"openapi"}>OpenAPI:</StyledNavigationGroup>)

    nav.push(...["info", "externalDocs", "servers", "tags"].map(key => {
      if (data[key] === undefined) { return []}
      const name = `- ${key}`.split("").reverse().join("")
      return (
        <StyledNavRef key={key}>
          <StyledPath onClick={() => selectAnchor(key)}>{name}</StyledPath>
        </StyledNavRef>
      )
    }))
    nav.push(<StyledNavigationGroup key={"paths"}>Paths:</StyledNavigationGroup>)
    const { paths = {}, components = {} } = data
    for (const path in paths) {
      const methods = []
      for (const method in paths[path]) {
        const id = `paths/${encodeKey(path)}/${method}`
        methods.push(<StyledMethod key={id} method={method} onClick={() => selectAnchor(id)}>{method.toLocaleUpperCase()}</StyledMethod>)
      }
      const _path = path.replaceAll(new RegExp("\{(.*?)\}", "ig"), "}\u25CF{").split("").reverse().join("")
      const id = `paths/${encodeKey(path)}`
      nav.push(
        <div key={id}>
          <StyledNavRef>
            <StyledPath onClick={() => selectAnchor(id)}>{_path}</StyledPath> 
            {methods}
          </StyledNavRef>
        </div>)
    }
    const addComponentNavigation = (type: string, name: string) => {
      if (components?.[type]) {
        nav.push(<StyledNavigationGroup key={`components/${type}`}>{name}:</StyledNavigationGroup>)
        for (const key in components[type]) {
          const name = `- ${key}`.split("").reverse().join("")
          const id = `components/${type}/${key}`
          nav.push(
            <StyledNavRef key={id} >
              <StyledPath onClick={() => selectAnchor(id)}>{name}</StyledPath> 
            </StyledNavRef>)
        }
      }
    }

    addComponentNavigation("schemas", "Models")
    addComponentNavigation("responses", "Responses")
    addComponentNavigation("parameters", "Parameters")
    addComponentNavigation("examples", "Exapmles")
    addComponentNavigation("requestBodies", "Request bodies")
    addComponentNavigation("headers", "Headers")
    addComponentNavigation("securitySchemes", "Security schemes")
    addComponentNavigation("links", "Links")
    addComponentNavigation("callbacks", "Callbacks")
  } 

  return <StyledApiNavigation>{nav}</StyledApiNavigation>
}
