import React, { useRef } from "react"
import { useResize } from "../hooks/useResize"
import "./SideBar.css"

export interface ApiNavigationeProps {
  children?: React.ReactNode;
}

export const SideBar = ({ children }: ApiNavigationeProps) => {
  const ref = useRef<any>()
  const { resizing, initResize } = useResize(ref)

  return (
    <div className="sidebar">
      <div className="content" ref={ref}>
        <div className="navigation">
          { children }
        </div>
      </div>
      <div className={`resizer${resizing ? " hidden" : ""}`} onMouseDown={initResize} />
    </div>
  )
}
