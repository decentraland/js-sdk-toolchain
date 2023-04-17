import React, { useEffect } from 'react'
import { useDrop } from 'react-dnd'

import { Props } from './types'

import './Block.css'

const Block: React.FC<React.PropsWithChildren<Props>> = ({
  acceptDropTypes = [],
  label,
  children,
  onDrop  = () => null,
  onDropHover = () => null
}) => {
  const [{ isActive }, drop] = useDrop(
    () => ({
      accept: acceptDropTypes,
      drop: (val, monitor) => {
        if (monitor.didDrop()) return
        onDrop(val)
      },
      collect: (monitor) => ({
        isActive: monitor.canDrop() && monitor.isOver(),
      })
    }),
    [label, children]
  )

  useEffect(() => {
    onDropHover(isActive)
    return () => onDropHover(false)
  }, [isActive])

  return (
    <div ref={drop} className="Block">
      {label && <label>{label}</label>}
      <div className="content">{children}</div>
    </div>
  )
}

export default React.memo(Block)
