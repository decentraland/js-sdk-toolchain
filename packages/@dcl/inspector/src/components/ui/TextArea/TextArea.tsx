import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'

import { InfoTooltip } from '../InfoTooltip'
import { Message, MessageType } from '../Message'

import { Props } from './types'

import './TextArea.css'

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
      return <InfoTooltip text={moreInfo} position="top center" />
    }

    return moreInfo
  }, [moreInfo])

  return (
    <div
      className={cx('TextArea Field', className, {
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
        value={inputValue}
        {...rest}
      ></textarea>
      <Message text={error} type={MessageType.ERROR} />
    </div>
  )
})

export default React.memo(TextArea)
