import React from 'react'
import cx from 'classnames'

import './ToolbarButton.css'

const ToolbarButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  const { className, ...rest } = props
  return <button className={cx('ToolbarButton', className)} {...rest} />
}

export default React.memo(ToolbarButton)
