import React from 'react'
import cx from 'classnames'
import { Label } from '../ui'
import { Props } from './types'

import './Block.css'

const Block = React.forwardRef<HTMLDivElement, React.PropsWithChildren<Props>>(
  ({ label, error, className, children }, ref) => {
    return (
      <div ref={ref} className={cx('Block', className, { error })}>
        <Label text={label} />
        <div className="content">{children}</div>
      </div>
    )
  }
)

export default React.memo(Block)
