import React, { useCallback, useState } from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'

import { Props } from './types'

import './CheckboxField.css'

function isErrorMessage(error?: boolean | string): boolean {
  return !!error && typeof error === 'string'
}

const CheckboxField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { className, checked, label, error, disabled, onChange, type = 'checkbox', ...rest } = props
  const [inputValue, setInputValue] = useState(checked)

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      setInputValue(event.target.checked)
      onChange && onChange(event)
    },
    [setInputValue, onChange]
  )

  return (
    <div className={cx('CheckboxField', className, { disabled: disabled })}>
      <div
        className={cx('input-container', {
          disabled: disabled,
          error: !!error
        })}
      >
        <input
          type={type}
          ref={ref}
          checked={!!inputValue}
          onChange={handleInputChange}
          disabled={disabled}
          {...rest}
        />
        <label>{label}</label>
      </div>
      {isErrorMessage(error) && (
        <p className="error-message">
          <AlertIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
})

export default React.memo(CheckboxField)
