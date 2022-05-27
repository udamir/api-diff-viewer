import React, { useContext, useState } from "react"
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
  /**
   * Api compare rules
   */
  rules?: "OpenApi3" | "AsyncApi2" | "JsonSchema"

  onClick?: () => any
}

export const NavApiNavigation = ({ data, rules }: ApiNavigationeProps) => {
  
  const { navigate } = useContext(DiffContext)

  const selectAnchor = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    navigate && navigate(id)
  }

  const nav = []
  if (rules === "OpenApi3") {
    let i = 0
    nav.push(<StyledNavigationGroup key={i++}>Paths:</StyledNavigationGroup>)
    const { paths = [], components = [] } = data
    for (const path in paths) {
      const methods = []
      for (const method in paths[path]) {
        const id = `paths/${encodeKey(path)}/${method}`
        methods.push(<StyledMethod key={i++} method={method} onClick={() => selectAnchor(id)}>{method.toLocaleUpperCase()}</StyledMethod>)
      }
      const _path = path.replace(new RegExp("\{(.*?)\}"), "}\u25CF{").split("").reverse().join("")
      nav.push(
        <div key={i++}>
          <StyledNavRef  >
            <StyledPath onClick={() => selectAnchor(`paths/${encodeKey(path)}`)}>{_path}</StyledPath> 
            {methods}
          </StyledNavRef>
        </div>)
    }
    const addComponentNavigation = (type: string, name: string) => {
      if (components?.[type]) {
        nav.push(<StyledNavigationGroup key={i++}>{name}:</StyledNavigationGroup>)
        for (const key in components[type]) {
          const name = key.split("").reverse().join("")
          nav.push(
            <StyledNavRef key={i++} >
              <StyledPath onClick={() => selectAnchor(`components/${type}/${key}`)}>{name}</StyledPath> 
            </StyledNavRef>)
        }
      }
    }

    addComponentNavigation("schemas", "Models")
    addComponentNavigation("parameters", "Parameters")
    addComponentNavigation("securitySchemes", "Security schemes")
  } 

  return <StyledApiNavigation>{nav}</StyledApiNavigation>
}
