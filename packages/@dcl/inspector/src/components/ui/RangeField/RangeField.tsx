import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'

import { TextField } from '../TextField'
import { ErrorMessage } from '../ErrorMessage'

import { Props } from './types'

import './RangeField.css'

const RangeField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const {
    label,
    rightLabel,
    error,
    disabled,
    value = 0,
    min = 0,
    max = 100,
    step = 1,
    isValidValue,
    onChange,
    onBlur,
    ...rest
  } = props
  const [inputValue, setInputValue] = useState(value)

  const completionPercentage = useMemo(() => {
    const validValue = isValidValue && isValidValue(inputValue) ? inputValue : value
    return Math.min(
      ((parseInt(validValue.toString()) - parseInt(min.toString())) /
        (parseInt(max.toString()) - parseInt(min.toString()))) *
        100,
      100
    )
  }, [inputValue, min, max])

  // Create inline styles for the track with the completion color
  const trackStyle = {
    '--completionPercentage': `${completionPercentage}%`
  } as any

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)

      if (isValidValue && isValidValue(value)) {
        onChange && onChange(e)
      }
    },
    [onChange, isValidValue, setInputValue]
  )

  const handleChangeTextField = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)
    },
    [setInputValue]
  )

  const handleOnBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (isValidValue && isValidValue(inputValue)) {
        onChange &&
          onChange({ ...event, target: { ...event.target, value: inputValue } } as React.ChangeEvent<HTMLInputElement>)
      }
    },
    [inputValue, onChange, isValidValue]
  )

  const errorMessage = useMemo(() => {
    if (isValidValue && !isValidValue(inputValue)) {
      return 'Invalid value'
    }
    return undefined
  }, [inputValue, isValidValue])

  return (
    <div className="RangeFieldContainer">
      {label ? <label>{label}</label> : null}
      <div className={cx('RangeField', { error, disabled })}>
        <div className="RangeInputContainer">
          <input
            ref={ref}
            type="range"
            className="RangeInput"
            value={value}
            min={min}
            max={max}
            step={step}
            style={trackStyle}
            disabled={disabled}
            onChange={handleChange}
            {...rest}
          />
        </div>
        <TextField
          className="RangeTextInput"
          type="number"
          value={inputValue}
          error={!!errorMessage}
          disabled={disabled}
          onChange={handleChangeTextField}
          onBlur={handleOnBlur}
        />
      </div>
      <ErrorMessage error={errorMessage} />
    </div>
  )
})

export default React.memo(RangeField)
