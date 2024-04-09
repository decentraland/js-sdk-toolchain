import React, { useEffect, useRef, useState } from 'react'

import { PropTypes } from './types'

import './Input.css'

const submittingKeys = new Set(['Enter'])
const cancelingKeys = new Set(['Escape', 'Tab'])
const dismissableTargets = new Set(['menu', 'menuitem'])

type Roles = { role: string; parentRole: string }
const getRolesFromTarget = (target: HTMLElement | null): Roles => {
  if (!target) return { role: '', parentRole: '' }
  return {
    role: target.role ?? '',
    parentRole: target.parentElement?.role ?? ''
  }
}

const Input = ({ value, onCancel, onSubmit, onChange, onBlur, placeholder }: PropTypes) => {
  const ref = useRef<HTMLInputElement>(null)
  const [stateValue, setStateValue] = useState(value)

  const getValue = () => ref.current?.value || value

  const onKeyUp = (e: KeyboardEvent) => {
    if (cancelingKeys.has(e.key)) onCancel && onCancel()
    if (submittingKeys.has(e.key)) onSubmit && onSubmit(getValue())
  }

  const onBlurCallback = (e: FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    const { parentRole, role } = getRolesFromTarget(relatedTarget)
    // custom fix for context menu to avoid stealing focus (thus triggering onBlur on input's)
    // when hiding. We check if the relatedTarget's role and it's parent role is in the
    // dismissable targets list. If it is, instead of running the onBlur cb, we focus the input.
    // Otherwise, we run the onBlur cb...
    if (dismissableTargets.has(role) || dismissableTargets.has(parentRole)) {
      ref.current?.focus()
    } else {
      onBlur && onBlur(e)
    }
  }

  useEffect(() => {
    // force focus to input
    ref.current?.focus()
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
