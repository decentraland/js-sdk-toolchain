import React, { useCallback } from 'react'

import { Props } from './types'

import './SelectField.css'

const Select: React.FC<Props> = (props) => {
  const { label, options = [], onChange, ...rest } = props

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.target.blur()
      if (props.onChange) props.onChange(e)
    },
    [onChange]
  )

  return (
    <div className="SelectField">
      {label && <label>{label}</label>}
      <select {...rest} onChange={handleChange}>
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
