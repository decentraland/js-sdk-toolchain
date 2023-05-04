import React from 'react'
import cx from 'classnames'

import { Props } from './types'

import './Block.css'

const Block = React.forwardRef<null, React.PropsWithChildren<Props>>(({ label, broken, children }, ref) => {
  return (
    <div ref={ref} className={cx("Block", { broken })}>
      {label && <label>{label}</label>}
      <div className="content">{children}</div>
    </div>
  )
})

export default React.memo(Block)
