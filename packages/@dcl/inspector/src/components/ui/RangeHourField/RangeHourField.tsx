import React, { useCallback, useEffect, useMemo, useState } from 'react'
import cx from 'classnames'

import { MIDNIGHT_SECONDS } from '../../../components/EntityInspector/SceneInspector/utils'

import { Props } from './types'

import './RangeHourField.css'

const MIN_SECONDS = 0
const STEP_SECONDS = 60
const MAX_SECONDS = MIDNIGHT_SECONDS - STEP_SECONDS

function formatHour(value: number): string {
  if (value === MIDNIGHT_SECONDS) {
    return '00:00'
  }
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const RangeHourField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { disabled, value = 0, onChange, ...rest } = props

  const [time, setTime] = useState({
    timeInSeconds: Number(value),
    timeInHHMM: formatHour(Number(value))
  })

  useEffect(() => {
    const numValue = Number(value)
    if (numValue !== time.timeInSeconds) {
      setTime({
        timeInSeconds: numValue,
        timeInHHMM: formatHour(numValue)
      })
    }
  }, [value])

  const completionPercentage = useMemo(() => {
    const normalizedValue = Math.min(Math.max(time.timeInSeconds, MIN_SECONDS), MAX_SECONDS)
    return ((normalizedValue - MIN_SECONDS) / (MAX_SECONDS - MIN_SECONDS)) * 100 || 0
  }, [time.timeInSeconds])

  const trackStyle = {
    '--completionPercentage': `${completionPercentage}%`
  } as any

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numValue = parseFloat(e.target.value)
      const valueToSend = numValue === MIN_SECONDS ? MIDNIGHT_SECONDS : numValue
      setTime({
        timeInSeconds: numValue,
        timeInHHMM: formatHour(numValue)
      })
      onChange &&
        onChange({
          ...e,
          target: { ...e.target, value: valueToSend.toString() }
        } as React.ChangeEvent<HTMLInputElement>)
    },
    [onChange]
  )

  const parseTimeInput = useCallback((timeStr: string): number => {
    const [hours = '0', minutes = '0'] = timeStr.split(':')
    const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60
    if (totalSeconds === MIN_SECONDS) {
      return MIDNIGHT_SECONDS
    }
    return Math.min(Math.max(totalSeconds, MIN_SECONDS), MAX_SECONDS)
  }, [])

  const handleChangeTextField = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const seconds = parseTimeInput(inputValue)
      const valueToSend = seconds === MIN_SECONDS ? MIDNIGHT_SECONDS : seconds
      setTime({
        timeInSeconds: seconds,
        timeInHHMM: inputValue
      })
      onChange &&
        onChange({
          ...e,
          target: { ...e.target, value: valueToSend.toString() }
        } as React.ChangeEvent<HTMLInputElement>)
    },
    [onChange, parseTimeInput]
  )

  return (
    <div className="Range Field">
      <div className={cx('RangeContainer', { disabled })}>
        <div className="InputContainer">
          <input
            ref={ref}
            type="range"
            className="RangeInput"
            min={MIN_SECONDS}
            max={MAX_SECONDS}
            step={STEP_SECONDS}
            value={time.timeInSeconds}
            style={trackStyle}
            disabled={disabled}
            onChange={handleChange}
            {...rest}
          />
        </div>
        <input
          className="RangeTextInput"
          type="time"
          value={time.timeInHHMM}
          disabled={disabled}
          onChange={handleChangeTextField}
          onBlur={handleChangeTextField}
        />
      </div>
    </div>
  )
})

export default React.memo(RangeHourField)
