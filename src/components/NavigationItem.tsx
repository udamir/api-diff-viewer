import React from "react"
import styled from "styled-components"

const StyledNavRef = styled.div<{ active: boolean }>`
  cursor: pointer;
  white-space: nowrap;
  color: #ebf1f5;
  overflow: hidden;
  background-color: ${ ({ active }) => active ? "lightgray" : "white" };
  &:hover {
    background-color: #F2F3F5;
  }
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

export interface NavigationItemProps {
  id: string
  name: string
  onClick?: () => void
  active?: boolean
  children?: React.ReactNode
}

export const NavigationItem = ({ name, onClick, children, active }: NavigationItemProps) => {
  return (
    <StyledNavRef active={!!active} >
      <StyledPath onClick={onClick}>{name}</StyledPath>
      { children }
    </StyledNavRef>
  )
}
