import React, { useRef } from "react"
import styled from "styled-components"
import { useResize } from "../hooks/useResize"

const StyledSidebar = styled.div`
  overflow: hidden;
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 200px;
  max-width: 400px;
  display: flex;
  border-right: #e9e9e9 1px solid;
  flex-direction: row;
  z-index: 2;
  font-size: 14px;
  line-height: 18px;
  font-family: "SF Mono",ui-monospace,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
`

const StyledSidebarContent = styled.div`
  width: 200px;
  flex: 1;
  transition: all .2s linear; 
  padding-right: 5px;
`

const StyledSidebarResizer = styled.div`
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 6px;
  justify-self: flex-end;
  cursor: col-resize;
  resize: horizontal;
  :hover {
    width: 3px;
    background: #c1c3c5b4;
    user-select: none;
  }
`

export interface ApiNavigationeProps {
  children?: React.ReactNode;
}

export const SideBar = ({ children }: ApiNavigationeProps) => {
  const ref = useRef<any>()
  const { initResize } = useResize(ref)

  return (
    <StyledSidebar>
      <StyledSidebarContent ref={ref}>
        {  children }
      </StyledSidebarContent>
      <StyledSidebarResizer onMouseDown={initResize} />
    </StyledSidebar>
  )
}
