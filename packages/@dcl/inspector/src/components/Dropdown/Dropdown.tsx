import React from 'react'
import cx from 'classnames'
import { Props } from './types'
import './Dropdown.css'

const Dropdown: React.FC<Props> = (props) => {
  const { className, label, options, ...rest } = props
  return (
    <div className="DropdownContainer">
      {label ? <label>{label}</label> : null}
      <select className={cx('Dropdown', className)} {...rest}>
        {options.map((option) => {
          if (typeof option === 'string') {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            )
          } else {
            return (
              <option key={option.value} value={option.value}>
                {option.text}
              </option>
            )
          }
        })}
      </select>
    </div>
  )
}

export default React.memo(Dropdown)
