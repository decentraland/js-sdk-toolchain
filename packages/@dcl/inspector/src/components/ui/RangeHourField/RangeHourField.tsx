import React, { useCallback, useEffect, useMemo, useState } from 'react'
import cx from 'classnames'

import { Message, MessageType } from '../Message'
import { Label } from '../Label'

import { Props } from './types'

import './RangeHourField.css'

function formatHour(value: number): string {
  if (value === 86400) {
    return '00:00'
  }
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function isValidTimeFormat(value: string): boolean {
  return /^([0-9]{2}):([0-9]{2})$/.test(value)
}

const RangeHourField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const {
    label,
    error,
    disabled,
    info,
    value = 0,
    min = 0,
    max = 86340,
    step = 60,
    isValidValue,
    onChange,
    onBlur,
    ...rest
  } = props

  const [inputValue, setInputValue] = useState<number>(Number(value))
  const [textValue, setTextValue] = useState(formatHour(Number(value)))

  useEffect(() => {
    const numValue = Number(value)
    if (numValue !== inputValue) {
      setInputValue(numValue)
      setTextValue(formatHour(numValue))
    }
  }, [value])

  const completionPercentage = useMemo(() => {
    const parsedMin = parseFloat(min.toString()) || 0
    const parsedMax = parseFloat(max.toString()) || 86400

    const normalizedValue = Math.min(Math.max(inputValue, parsedMin), parsedMax)

    return ((normalizedValue - parsedMin) / (parsedMax - parsedMin)) * 100 || 0
  }, [inputValue, min, max])

  const trackStyle = {
    '--completionPercentage': `${completionPercentage}%`
  } as any

  const isValid = useCallback(
    (value: Props['value']) => {
      return isValidValue ? isValidValue(value) : true
    },
    [isValidValue]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      const numValue = parseFloat(value)

      if (numValue >= parseFloat(min.toString()) && numValue <= parseFloat(max.toString())) {
        setInputValue(numValue)
        setTextValue(formatHour(numValue))

        if (isValid(numValue)) {
          onChange &&
            onChange({
              ...e,
              target: { ...e.target, value: numValue.toString() }
            } as React.ChangeEvent<HTMLInputElement>)
        }
      }
    },
    [min, max, onChange, isValid]
  )

  const parseTimeInput = useCallback((timeStr: string): number => {
    const [hours = '0', minutes = '0'] = timeStr.split(':')
    const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60
    if (totalSeconds === 0) {
      return 86400
    }
    return Math.min(Math.max(totalSeconds, 0), 86400)
  }, [])

  const handleChangeTextField = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      if (!/^[0-9:]*$/.test(value)) return

      if (value.length <= 5) {
        setTextValue(value)

        if (isValidTimeFormat(value)) {
          const seconds = parseTimeInput(value)
          if (seconds >= Number(min) && seconds <= Number(max)) {
            setInputValue(seconds)
            onChange &&
              onChange({
                ...e,
                target: { ...e.target, value: seconds.toString() }
              } as React.ChangeEvent<HTMLInputElement>)
          }
        }
      }
    },
    [onChange, parseTimeInput, min, max]
  )

  const handleOnBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      let finalValue = textValue

      if (!isValidTimeFormat(textValue)) {
        finalValue = formatHour(inputValue)
      } else {
        const seconds = parseTimeInput(textValue)
        if (seconds < Number(min) || seconds > Number(max)) {
          finalValue = formatHour(inputValue)
        }
      }

      setTextValue(finalValue)
      const seconds = parseTimeInput(finalValue)
      setInputValue(seconds)

      if (isValid(seconds)) {
        onChange &&
          onChange({
            ...event,
            target: { ...event.target, value: seconds.toString() }
          } as React.ChangeEvent<HTMLInputElement>)
      }

      onBlur && onBlur(event)
    },
    [textValue, inputValue, onChange, isValid, onBlur, parseTimeInput, min, max]
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
        <input
          className="RangeTextInput"
          type="time"
          value={textValue}
          disabled={disabled}
          onChange={handleChangeTextField}
          onBlur={handleOnBlur}
        />
      </div>
      {renderMessage()}
    </div>
  )
})

export default React.memo(RangeHourField)
