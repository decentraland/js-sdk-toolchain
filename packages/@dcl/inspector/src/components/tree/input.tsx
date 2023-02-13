import React, { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onCancel: () => void
  onSubmit: (newValue: string) => void
}

const submittingKeys = new Set(['Enter'])
const cancelingKeys = new Set(['Escape', 'Tab'])

export const Input = ({ value, onCancel, onSubmit }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const [stateValue, setStateValue] = useState(value)

  useEffect(() => {
    // force focus to input
    ref.current?.focus()

    const getValue = () => ref.current?.value || value

    const onBodyClick = (e: MouseEvent) => {
      if (e.target !== ref.current) onSubmit(getValue())
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (cancelingKeys.has(e.key)) onCancel()
      if (submittingKeys.has(e.key)) onSubmit(getValue())
    }

    const onBlur = (_: Event) => onCancel()

    document.body.addEventListener('click', onBodyClick)
    ref.current?.addEventListener('keyup', onKeyUp)
    ref.current?.addEventListener('blur', onBlur)
    return () => {
      document.body.removeEventListener('click', onBodyClick)
      ref.current?.removeEventListener('keyup', onKeyUp)
      ref.current?.removeEventListener('blur', onBlur)
    }
  }, [])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStateValue(e.target.value)
  }

  return (
    <input
      ref={ref}
      type='text'
      value={stateValue}
      onChange={handleTextChange}
    />
  )
}
