import React from 'react'

import { Props } from './types'

import './TextField.css'

const Input = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { label, ...rest } = props
  return (
    <div className="TextField">
      {label && <label>{label}</label>}
      <input ref={ref} {...rest} />
    </div>
  )
})

export default React.memo(Input)
