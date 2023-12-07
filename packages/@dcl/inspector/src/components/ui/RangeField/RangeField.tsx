import React, { useCallback, useEffect, useMemo, useState } from 'react'
import cx from 'classnames'

import { TextField } from '../TextField'
import { Message, MessageType } from '../Message'
import { Label } from '../Label'

import { Props } from './types'

import './RangeField.css'

function isFloat(value: any) {
  return Number.isFinite(value) && !Number.isInteger(value)
}

const RangeField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const {
    label,
    rightLabel,
    error,
    disabled,
    info,
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

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
    }
  }, [value])

  const completionPercentage = useMemo(() => {
    const parsedValue = parseFloat(inputValue.toString()) || 0
    const parsedMin = parseFloat(min.toString()) || 0
    const parsedMax = parseFloat(max.toString()) || 100

    const normalizedValue = Math.min(Math.max(parsedValue, parsedMin), parsedMax)

    return ((normalizedValue - parsedMin) / (parsedMax - parsedMin)) * 100 || 0
  }, [inputValue, min, max])

  // Create inline styles for the track with the completion color
  const trackStyle = {
    '--completionPercentage': `${completionPercentage}%`
  } as any

  const isValid = useCallback(
    (value: Props['value']) => {
      return isValidValue ? isValidValue(value) : true
    },
    [isValidValue]
  )

  const formatInput = useCallback(
    (value: Props['value'] = 0) => {
      const decimals = isFloat(step) ? 2 : 0
      return parseFloat(value.toString()).toFixed(decimals)
    },
    [step]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      if (parseFloat(value) >= parseFloat(min.toString()) && parseFloat(value) <= parseFloat(max.toString())) {
        setInputValue(value)
      }

      if (isValid(value)) {
        onChange && onChange(e)
      }
    },
    [min, max, onChange, isValid, setInputValue]
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
      if (isValid(inputValue)) {
        const formattedValue = formatInput(inputValue)
        onChange &&
          onChange({
            ...event,
            target: { ...event.target, value: formattedValue }
          } as React.ChangeEvent<HTMLInputElement>)
        setInputValue(formattedValue)
      }
    },
    [inputValue, setInputValue, formatInput, onChange, isValid]
  )

  const errorMessage = useMemo(() => {
    if (!isValid(inputValue)) {
      return 'Invalid value'
    }
    return undefined
  }, [inputValue, isValid])

  const renderMessage = useCallback(() => {
    if (errorMessage) {
      return <Message text={errorMessage} type={MessageType.ERROR} />
    } else if (info) {
      return <Message text={info} type={MessageType.INFO} icon={false} />
    }

    return null
  }, [errorMessage, info])

  return (
    <div className="Range Field">
      <Label text={label} />
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
      {renderMessage()}
    </div>
  )
})

export default React.memo(RangeField)
