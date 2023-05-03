import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { PropTypes, TypeProps, HORIZONTAL_PROPS, VERTICAL_PROPS } from './types'

import './Resizable.css'

const getProperties = (type: PropTypes['type']): TypeProps => type === 'horizontal' ? HORIZONTAL_PROPS : VERTICAL_PROPS

function Resizable(props: React.PropsWithChildren<PropTypes>) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState<[number | null, number | null]>([props.initial ?? null, null])
  const [minValue, setMinValue] = useState(0)
  const [dragging, setDragging] = useState(false)
  const children = React.Children.toArray(props.children)
  const { offsetValue, eventClientValue, css } = getProperties(props.type)

  if (!children.length) return null
  if (children.length !== 2) return <>{props.children}</>

  useLayoutEffect(() => {
    if (!ref.current) return
    setValue([ref.current[offsetValue], getParentOffset() - ref.current[offsetValue]])
  }, [])

  useEffect(() => {
    if (props.min === 'initial') {
      setMinValue(ref.current![offsetValue])
    } else if (props.min) {
      setMinValue(props.min)
    }
  }, [props.min])

  const getParentOffset = useCallback(() => {
    const parent = ref.current?.parentElement?.parentElement ?? undefined
    return parent ? parent[offsetValue] : 0
  }, [value])

  const handleDrag = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const clientValue = event[eventClientValue]
    const diff = getParentOffset() - clientValue
    if (!dragging || clientValue <= minValue || clientValue > (props.max || Infinity)) return
    setValue([clientValue, diff])
    if (props.onChange) props.onChange([clientValue, diff])
  }

  const handleMouseUp = useCallback(() => setDragging(false), [])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className={`Resizable ${props.type}`} onMouseMove={handleDrag}>
      <div ref={ref} style={{ [css.childs]: value[0] ?? 'auto' }}>{children[0]}</div>
      <div className="resize-handle" style={{ [css.handle]: value[0] ?? 0 }} onMouseDown={() => setDragging(true)} />
      <div style={{ [css.childs]: value[1] ?? 'auto' }}>{children[1]}</div>
    </div>
  )
}

export default Resizable
