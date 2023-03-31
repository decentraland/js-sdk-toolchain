import React from 'react'
import { Props } from './types'
import './TextField.css'

const Input: React.FC<Props> = (props) => {
  const { label, ...rest } = props
  return (
    <div className="TextField">
      {label && <label>{label}</label>}
      <input {...rest}></input>
    </div>
  )
}

export default React.memo(Input)
