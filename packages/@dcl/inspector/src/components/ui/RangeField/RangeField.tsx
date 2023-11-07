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
    const parsedValue = parseInt(inputValue.toString(), 10) || 0
    const parsedMin = parseInt(min.toString(), 10) || 0
    const parsedMax = parseInt(max.toString(), 10) || 100

    const normalizedValue = Math.min(Math.max(parsedValue, parsedMin), parsedMax)

    return ((normalizedValue - parsedMin) / (parsedMax - parsedMin)) * 100 || 0
  }, [inputValue, min, max])

  // Create inline styles for the track with the completion color
  const trackStyle = {
    '--completionPercentage': `${completionPercentage}%`
  } as any

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      if (parseFloat(value) >= parseFloat(min.toString()) && parseFloat(value) <= parseFloat(max.toString())) {
        setInputValue(value)
      }

      if (isValidValue && isValidValue(value)) {
        onChange && onChange(e)
      }
    },
    [min, max, onChange, isValidValue, setInputValue]
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
    <div className="Range Field">
      {label ? <label>{label}</label> : null}
      <div className={cx('RangeContainer', { error, disabled })}>
        <div className="InputContainer">
          <input
            ref={ref}
            type="range"
            className="RangeInput"
            value={inputValue}
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
