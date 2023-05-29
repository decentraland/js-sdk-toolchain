import React, { useEffect, useRef, useState } from 'react'

import { PropTypes } from './types'

import './Input.css'

const submittingKeys = new Set(['Enter'])
const cancelingKeys = new Set(['Escape', 'Tab'])

const Input = ({ value, onCancel, onSubmit, onChange, onBlur, placeholder }: PropTypes) => {
  const ref = useRef<HTMLInputElement>(null)
  const [stateValue, setStateValue] = useState(value)

  useEffect(() => {
    // force focus to input
    ref.current?.focus()

    const getValue = () => ref.current?.value || value

    const onKeyUp = (e: KeyboardEvent) => {
      if (cancelingKeys.has(e.key)) onCancel && onCancel()
      if (submittingKeys.has(e.key)) onSubmit && onSubmit(getValue())
    }

    const onBlurCallback = (e: FocusEvent) => { onBlur && onBlur(e) }

    ref.current?.addEventListener('keyup', onKeyUp)
    ref.current?.addEventListener('blur', onBlurCallback)
    return () => {
      ref.current?.removeEventListener('keyup', onKeyUp)
      ref.current?.removeEventListener('blur', onBlurCallback)
    }
  }, [])

  useEffect(() => {
    setStateValue(value)
  }, [value, setStateValue])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStateValue(value)
    onChange && onChange(value)
  }

  return (
    <input
      className="Input"
      ref={ref}
      type="text"
      placeholder={placeholder}
      value={stateValue}
      onChange={handleTextChange}
    />
  )
}

export default React.memo(Input)
