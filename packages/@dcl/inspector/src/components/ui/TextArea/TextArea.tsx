import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'
import { VscInfo as InfoIcon } from 'react-icons/vsc'

import { InfoTooltip } from '../InfoTooltip'

import { Props } from './types'

import './TextArea.css'

function isErrorMessage(error?: boolean | string): boolean {
  return !!error && typeof error === 'string'
}

const TextArea = React.forwardRef<HTMLTextAreaElement, Props>((props, ref) => {
  const { className, disabled, error, label, moreInfo, value, onChange, onFocus, onBlur, ...rest } = props
  const [inputValue, setInputValue] = useState(value)
  const [isHovered, setHovered] = useState(false)
  const [isFocused, setFocused] = useState(false)

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
    }
  }, [inputValue, value, setInputValue])

  const handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      setInputValue(event.target.value)
      onChange && onChange(event)
    },
    [setInputValue, onChange]
  )

  const handleInputFocus: React.FocusEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      setFocused(true)
      onFocus && onFocus(event)
    },
    [setFocused, onFocus]
  )

  const handleInputBlur: React.FocusEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      setFocused(false)
      onBlur && onBlur(event)
    },
    [setFocused, onBlur]
  )

  const handleMouseEnter: React.MouseEventHandler<HTMLTextAreaElement> = useCallback(() => {
    setHovered(true)
  }, [setHovered])

  const handleMouseLeave: React.MouseEventHandler<HTMLTextAreaElement> = useCallback(() => {
    setHovered(false)
  }, [setHovered])

  const renderMoreInfo = useCallback(() => {
    if (!moreInfo) {
      return null
    }

    if (typeof moreInfo === 'string') {
      return <InfoTooltip text={moreInfo} position="top center" trigger={<InfoIcon size={16} />} />
    }

    return moreInfo
  }, [moreInfo])

  return (
    <div
      className={cx('TextArea', className, {
        hovered: isHovered,
        focused: isFocused,
        disabled: disabled,
        error: !!error
      })}
    >
      {label ? (
        <label>
          {label} {renderMoreInfo()}
        </label>
      ) : null}
      <textarea
        ref={ref}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        {...rest}
      >
        {inputValue}
      </textarea>
      {isErrorMessage(error) && (
        <p className="error-message">
          <AlertIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
})

export default React.memo(TextArea)
