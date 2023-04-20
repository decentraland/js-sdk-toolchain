import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

import './Resizable.css'
import { PropTypes } from './types'

// TODO: Only width/horizontal resize options for the moment
function Resizable(props: React.PropsWithChildren<PropTypes>) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<[number | null, number | null]>([props.initialWidth ?? null, null])
  const [minWidth, setMinWidth] = useState(0)
  const [dragging, setDragging] = useState(false)
  const children = React.Children.toArray(props.children)

  if (!children.length) return null
  if (children.length !== 2) return <div>{props.children}</div>

  useLayoutEffect(() => {
    if (!ref.current) return
    setWidth([ref.current.offsetWidth, getParentWidth() - ref.current.offsetWidth])
  }, [])

  useEffect(() => {
    if (props.minWidth === 'initial') {
      setMinWidth(ref.current!.offsetWidth)
    } else if (props.minWidth) {
      setMinWidth(props.minWidth)
    }
  }, [props.minWidth])

  function getParentWidth() {
    return ref.current?.parentElement?.parentElement?.offsetWidth ?? 0
  }

  const handleDrag = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const leftWidth = event.clientX
    const rightWidth = getParentWidth() - leftWidth
    if (!dragging || leftWidth <= minWidth) return
    setWidth([leftWidth, rightWidth])
    if (props.onChange) props.onChange([leftWidth, rightWidth])
  }

  function handleMouseUp() {
    setDragging(false)
  }

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="Resizable" onMouseMove={handleDrag}>
      <div ref={ref} style={{ width: width[0] ?? 'auto' }}>
        {children[0]}
      </div>
      <div className="resize-handle" style={{ left: width[0] ?? 0 }} onMouseDown={() => setDragging(true)} />
      <div style={{ width: width[1] ?? 'auto' }}>{children[1]}</div>
    </div>
  )
}

export default Resizable
