import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'

import { ErrorMessage } from '../ErrorMessage'
import { Label } from '../Label'

import { Props } from './types'

import './TextField.css'

const TextField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const {
    drop,
    className,
    error,
    label,
    leftLabel,
    leftIcon,
    rightLabel,
    rightIcon,
    value,
    disabled,
    leftContent,
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
    if (leftLabel) {
      return (
        <div className="LeftContent">
          <Label className="InputLabel" text={leftLabel} />
        </div>
      )
    } else if (leftIcon) {
      return (
        <div className="LeftContent">
          <span className="LeftIcon">{leftIcon}</span>
        </div>
      )
    } else if (leftContent) {
      return <div className="LeftContent">{leftContent}</div>
    }
  }, [leftLabel, leftIcon, leftContent])

  const renderRightContent = useCallback(() => {
    if (rightLabel) {
      return (
        <div className="RightContent">
          <Label className="InputLabel" text={rightLabel} />
        </div>
      )
    } else if (rightIcon) {
      return (
        <div className="RightContent">
          <span className="RightIcon">{rightIcon}</span>
        </div>
      )
    }
  }, [rightLabel, rightIcon])

  return (
    <div className={cx('Text Field', className)}>
      <Label text={label} />
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
