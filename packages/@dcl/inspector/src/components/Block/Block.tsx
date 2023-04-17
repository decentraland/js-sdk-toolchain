import React from 'react'
import { useDrop } from 'react-dnd'

import { Props } from './types'

import './Block.css'

const Block: React.FC<React.PropsWithChildren<Props>> = ({
  acceptDropTypes = [],
  label,
  children,
  onDrop,
}) => {
  const [, drop] = onDrop ? useDrop(
    () => ({
      accept: acceptDropTypes,
      drop: (val, monitor) => {
        if (monitor.didDrop()) return
        onDrop(val)
      }
    }),
    [label, children]
  ) : [null, null]

  return (
    <div ref={drop} className="Block">
      {label && <label>{label}</label>}
      <div className="content">{children}</div>
    </div>
  )
}

export default React.memo(Block)
