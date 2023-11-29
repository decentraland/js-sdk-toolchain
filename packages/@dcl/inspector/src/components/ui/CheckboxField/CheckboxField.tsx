import React, { useCallback, useState } from 'react'
import cx from 'classnames'
import { ErrorMessage } from '../ErrorMessage'
import { Label } from '../Label'
import { Props } from './types'

import './CheckboxField.css'

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
    <div className={cx('Checkbox Field', className, { disabled: disabled })}>
      <div
        className={cx('InputContainer', {
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
        <Label text={label} />
      </div>
      <ErrorMessage error={error} />
    </div>
  )
})

export default React.memo(CheckboxField)
