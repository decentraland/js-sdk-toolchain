import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'

import { Message, MessageType } from '../Message'
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

  const handleTextAreaChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      setInputValue(event.target.value)
      onChange && onChange(event as unknown as React.ChangeEvent<HTMLInputElement>)
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

  const handleTextAreaBlur: React.FocusEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      setFocused(false)
      onBlur && onBlur(event as unknown as React.FocusEvent<HTMLInputElement>)
    },
    [setFocused, onBlur]
  )

  const handleTextAreaFocus: React.FocusEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      setFocused(true)
      onFocus && onFocus(event as unknown as React.FocusEvent<HTMLInputElement>)
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

  const handleMouseEnter: React.MouseEventHandler = useCallback(() => {
    setHovered(true)
  }, [setHovered])

  const handleMouseLeave: React.MouseEventHandler = useCallback(() => {
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
    <div className={cx('Text Field', className, type)}>
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
        {type === 'textarea' ? (
          <textarea
            className="input"
            value={inputValue}
            onChange={handleTextAreaChange}
            onFocus={handleTextAreaFocus}
            onBlur={handleTextAreaBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            {...(rest as unknown as React.InputHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            className="input"
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
        )}
        {renderRightContent()}
      </div>
      <Message text={error} type={MessageType.ERROR} />
    </div>
  )
})

export default React.memo(TextField)
