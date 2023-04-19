import React from 'react'

import { Props } from './types'

import './Block.css'

const Block = React.forwardRef<null, React.PropsWithChildren<Props>>(({ label, children }, ref) => {
  return (
    <div ref={ref} className="Block">
      {label && <label>{label}</label>}
      <div className="content">{children}</div>
    </div>
  )
})

export default React.memo(Block)
