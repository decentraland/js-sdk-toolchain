import React from 'react'
import cx from 'classnames'

import { Props } from './types'

import './TextField.css'

const Input = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { label, rightLabel, error, ...rest } = props
  return (
    <div className={cx('TextField', { error })}>
      {label && <label>{label}</label>}
      <input ref={ref} {...rest} />
      {rightLabel && <label>{rightLabel}</label>}
    </div>
  )
})

export default React.memo(Input)
