import React from 'react'
import cx from 'classnames'
import './Box.css'

interface Props {
  className?: string
}

function Box({ children, className }: React.PropsWithChildren<Props>) {
  return (
    <div className={cx('Box', className)}>
      <div className="content">{children}</div>
    </div>
  )
}

export default Box
