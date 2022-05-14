import React from 'react'

export const useResize = (ref: any, step = 10) => {
  ref = ref || {}
  const [mouseX, setMouseX] = React.useState(Infinity)
  const [width, setWidth] = React.useState(Infinity)

  const initResize = (event: any) => {
    if (!ref.current) return
    setMouseX(event.clientX)
    const { width, height } = window.getComputedStyle(ref.current)
    setWidth(parseInt(width, 10))
  }

  React.useEffect(() => {
    const getValue = (input: number) => Math.ceil(input / step) * step

    const doDrag = (event: MouseEvent) => {
      if (!ref.current) return
      ref.current.style.width = getValue(width + event.clientX - mouseX) + 'px'
    }

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag, false)
      document.removeEventListener('mouseup', stopDrag, false)
    }

    document.addEventListener('mousemove', doDrag, false)
    document.addEventListener('mouseup', stopDrag, false)
  }, [width, mouseX, step, ref])

  return { initResize }
}
