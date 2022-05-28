import React from "react"
import styled from "styled-components"

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

export interface NavigationItemProps {
  id: string
  name: string
  onClick: (id: string) => void
  children?: React.ReactNode
}

export const NavigationItem = ({ id, name, onClick, children }: NavigationItemProps) => {
  return (
    <StyledNavRef>
      <StyledPath onClick={() => onClick(id)}>{name}</StyledPath>
      { children }
    </StyledNavRef>
  )
}
