import React from 'react'

export const useResize = (ref: any, step = 1, minWidth = 200, maxWidth = 400) => {
  ref = ref || {}
  const [mouseX, setMouseX] = React.useState(Infinity)
  const [width, setWidth] = React.useState(Infinity)
  const [resizing, setResizing] = React.useState(false)

  const initResize = (event: any) => {
    if (!ref.current) return
    setMouseX(event.clientX)
    setResizing(true)
    const { width } = window.getComputedStyle(ref.current)
    setWidth(parseInt(width, 10))
  }

  React.useEffect(() => {
    const getValue = (input: number) => Math.min(Math.max(Math.ceil(input / step) * step, minWidth), maxWidth)

    const doDrag = (event: MouseEvent) => {
      if (!ref.current) return
      ref.current.style.width = getValue(width + event.clientX - mouseX) + 'px'
    }

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag, false)
      document.removeEventListener('mouseup', stopDrag, false)
      setResizing(false)
    }

    document.addEventListener('mousemove', doDrag, false)
    document.addEventListener('mouseup', stopDrag, false)
  }, [width, mouseX, step, ref])

  return { initResize, resizing }
}
