import React from 'react'
import cx from 'classnames'
import { Props } from './types'
import './Dropdown.css'

const optionHasTextAndValue = (
  option: string | { text: string; value: string | number }
): option is { text: string; value: string | number } => {
  return Object.prototype.hasOwnProperty.call(option, 'text') && Object.prototype.hasOwnProperty.call(option, 'value')
}

const Dropdown: React.FC<Props> = (props) => {
  const { className, label, options, ...rest } = props
  return (
    <div className="DropdownContainer">
      {label ? <label>{label}</label> : null}
      <select className={cx('Dropdown', className)} {...rest}>
        {options.map((option) => {
          if (optionHasTextAndValue(option)) {
            return (
              <option key={option.value} value={option.value}>
                {option.text}
              </option>
            )
          } else {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            )
          }
        })}
      </select>
    </div>
  )
}

export default React.memo(Dropdown)
