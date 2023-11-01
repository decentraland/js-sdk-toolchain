import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'

import { ErrorMessage } from '../ErrorMessage'

import { Props } from './types'

import './TextField.css'

const TextField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const {
    drop,
    className,
    error,
    label,
    leftIcon,
    rightLabel,
    rightIcon,
    value,
    disabled,
    onChange,
    onFocus,
    onBlur,
    type = 'text',
    ...rest
  } = props
  const [inputValue, setInputValue] = useState(value)
  const [isHovered, setHovered] = useState(false)
  const [isFocused, setFocused] = useState(false)

  useEffect(() => {
    if (inputValue !== value) {
      setInputValue(value)
    }
  }, [value])

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      setInputValue(event.target.value)
      onChange && onChange(event)
    },
    [setInputValue, onChange]
  )

  const handleInputFocus: React.FocusEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      setFocused(true)
      onFocus && onFocus(event)
    },
    [setFocused, onFocus]
  )

  const handleInputBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      setFocused(false)
      onBlur && onBlur(event)
    },
    [setFocused, onBlur]
  )

  const handleMouseEnter: React.MouseEventHandler<HTMLInputElement> = useCallback(() => {
    setHovered(true)
  }, [setHovered])

  const handleMouseLeave: React.MouseEventHandler<HTMLInputElement> = useCallback(() => {
    setHovered(false)
  }, [setHovered])

  const renderLeftContent = useCallback(() => {
    if (label) {
      return <div className="left-content">{<label className="input-label">{label}</label>}</div>
    } else if (leftIcon) {
      return (
        <div className="left-content">
          <span className="left-icon">{leftIcon}</span>
        </div>
      )
    }
  }, [label, leftIcon])

  const renderRightContent = useCallback(() => {
    if (rightLabel) {
      return <div className="right-content">{<label className="input-label">{rightLabel}</label>}</div>
    } else if (rightIcon) {
      return (
        <div className="right-content">
          <span className="right-icon">{rightIcon}</span>
        </div>
      )
    }
  }, [rightLabel, rightIcon])

  return (
    <div className={cx('TextField', className)}>
      <div
        className={cx('InputContainer', {
          hovered: isHovered,
          focused: isFocused,
          disabled: disabled,
          error: !!error
        })}
      >
        {renderLeftContent()}
        <input
          ref={ref}
          type={type}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
          {...rest}
        />
        {renderRightContent()}
      </div>
      <ErrorMessage error={error} />
    </div>
  )
})

export default React.memo(TextField)
