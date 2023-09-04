import React from 'react'

import { Props } from './types'

import './SelectField.css'

const Select: React.FC<Props> = (props) => {
  const { label, options = [], ...rest } = props
  return (
    <div className="SelectField">
      {label && <label>{label}</label>}
      <select {...rest}>
        {options.map(($, key) => (
          <Option {...$} key={`${$.value}-${key}`} />
        ))}
      </select>
    </div>
  )
}

export const Option: React.FC<React.OptionHTMLAttributes<HTMLElement>> = (props) => (
  <option {...props}>{props.label}</option>
)

export default React.memo(Select)
