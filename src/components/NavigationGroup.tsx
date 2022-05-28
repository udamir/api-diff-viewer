import React, { useContext } from "react"
import styled from "styled-components"

import { NavContext } from "../helpers/nav.context"
import { encodeKey, getPathValue } from "../utils"
import { NavigationItem } from "./NavigationItem"

const StyledNavigationGroup = styled.div`
  padding-bottom: 10px;
  padding-top: 20px;
  font-weight: bolder;
`

export interface CustomItemProps {
  id: string
  path: string[]
  navigate?: (id: string) => void
}

export interface NavigationGroupProps {
  paths: string[][]
  name: string
  CustomItem?: (props: CustomItemProps) => JSX.Element
}

export const NavigationGroup = ({ paths, name, CustomItem }: NavigationGroupProps) => {

  const { data, navigate } = useContext(NavContext)

  const items = []

  for (const path of paths) {
    if (getPathValue(data, path) === undefined) { continue }
    const itemId = path.map(encodeKey).join("/")
    const onClick = () => navigate && navigate(itemId)
    if (CustomItem) {
      items.push(<CustomItem key={itemId} id={itemId} path={path} navigate={navigate} />)
    } else {
      const name = `- ${path.slice(-1).pop()}`.split("").reverse().join("")
      items.push(<NavigationItem key={itemId} id={itemId} name={name} onClick={onClick} />)
    }
  }

  if (items.length) {
    return (
      <>
        <StyledNavigationGroup key={name}>{name}:</StyledNavigationGroup>
        {items}
      </>
    )
  }
  return <div />
}
