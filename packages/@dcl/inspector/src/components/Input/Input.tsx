import React, { useEffect, useRef, useState } from 'react'

import { PropTypes } from './types'

import './Input.css'

const submittingKeys = new Set(['Enter'])
const cancelingKeys = new Set(['Escape', 'Tab'])

const Input = ({ value, onCancel, onSubmit, onChange, placeholder }: PropTypes) => {
  const ref = useRef<HTMLInputElement>(null)
  const [stateValue, setStateValue] = useState(value)

  useEffect(() => {
    // force focus to input
    ref.current?.focus()

    const getValue = () => ref.current?.value || value

    const onBodyClick = (e: MouseEvent) => {
      if (e.target !== ref.current) onSubmit && onSubmit(getValue())
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (cancelingKeys.has(e.key)) {
        ref.current?.removeEventListener('blur', onBlur)
        onCancel && onCancel()
      }
      if (submittingKeys.has(e.key)) {
        ref.current?.removeEventListener('blur', onBlur)
        onSubmit && onSubmit(getValue())
      }
    }

    const onBlur = (_: Event) => onSubmit && onSubmit(getValue())

    document.body.addEventListener('click', onBodyClick)
    ref.current?.addEventListener('keyup', onKeyUp)
    ref.current?.addEventListener('blur', onBlur)
    return () => {
      document.body.removeEventListener('click', onBodyClick)
      ref.current?.removeEventListener('keyup', onKeyUp)
      ref.current?.removeEventListener('blur', onBlur)
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
