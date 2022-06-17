import React, { useContext, useState } from "react"
import styled from "styled-components"

import { NavContext } from "../helpers/nav.context"
import { encodeKey, getPathValue } from "../utils"
import { NavigationItem } from "./NavigationItem"

const StyledNavigationGroup = styled.div`
  padding-bottom: 5px;
  padding-top: 10px;
  font-weight: bolder;
  cursor: pointer;
`

const collapsedIcon = `
  margin-top: 6px;
  transform: rotate(-45deg);
  -webkit-transform: rotate(-45deg);
`

const StyledToggle = styled.span<{ collapsed?: boolean }>`
  position: absolute;
  cursor: pointer;

  border: solid black;
  border-width: 0 2px 2px 0;
  padding: 2px;
  margin-top: 5px;

  transform: rotate(45deg);
  -webkit-transform: rotate(45deg);

  ${({ collapsed }) => collapsed && collapsedIcon}
`

const StyledName = styled.span`
  padding-left: 12px;
`

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
        <StyledNavigationGroup key={name} onClick={() => setCollapsed(!collapsed)}>
          <StyledToggle collapsed={collapsed} onClick={() => setCollapsed(!collapsed)}></StyledToggle>
          <StyledName>{name}</StyledName>
        </StyledNavigationGroup>
        { !collapsed && items }
      </div>
    )
  }
  return <div />
}
