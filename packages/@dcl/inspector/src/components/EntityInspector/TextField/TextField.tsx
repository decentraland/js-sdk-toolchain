import React from 'react'
import { Props } from './types'
import './TextField.css'

const Input: React.FC<Props> = (props) => {
  const { label, fractionDigits, ...rest } = props
  const value = props.type === 'number' && fractionDigits ? Number(rest.value).toFixed(fractionDigits) : rest.value
  return (
    <div className="TextField">
      {label && <label>{label}</label>}
      <input {...rest} value={value} />
    </div>
  )
}

export default React.memo(Input)
