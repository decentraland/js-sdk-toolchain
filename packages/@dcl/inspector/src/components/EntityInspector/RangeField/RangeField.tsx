import React, { useCallback, useState } from 'react'
import cx from 'classnames'

import { Props } from './types'

import './RangeField.css'

const Input = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { label, rightLabel, error, value = 0, min = 0, max = 100, step = 1, ...rest } = props

  const completionPercentage =
    ((parseInt(value.toString()) - parseInt(min.toString())) / (parseInt(max.toString()) - parseInt(min.toString()))) *
    100

  // Create inline styles for the track with the completion color
  const trackStyle = {
    '--completionPercentage': `${completionPercentage}%`
  } as any

  return (
    <div className={cx('RangeField', { error })}>
      <input
        ref={ref}
        type="range"
        className="RangeInput"
        value={value}
        min={min}
        max={max}
        step={step}
        style={trackStyle}
        {...rest}
      />
    </div>
  )
})

export default React.memo(Input)
