import { InputHTMLAttributes, useCallback, useEffect, useState } from 'react'
import { Entity } from '@dcl/ecs'
import { getValue, NestedKey, setValue } from '../../lib/logic/get-set-value'
import { Component } from '../../lib/sdk/components'
import { useComponentValue } from './useComponentValue'

type Input = {
  [key: string]: string | Record<string, string | Input>
}

export function isValidNumericInput(input: Input | string): boolean {
  if (typeof input === 'object') {
    return Object.values(input).every((value) => isValidNumericInput(value))
  }
  return input.length > 0 && !isNaN(Number(input))
}

export const useComponentInput = <ComponentValueType extends object, InputType extends Input>(
  entity: Entity,
  component: Component<ComponentValueType>,
  fromComponentValueToInput: (componentValue: ComponentValueType) => InputType,
  fromInputToComponentValue: (input: InputType) => ComponentValueType,
  isValidInput: (input: InputType) => boolean = () => true
) => {
  const [componentValue, setComponentValue, isEqual] = useComponentValue<ComponentValueType>(entity, component)
  const [input, setInput] = useState<InputType>(fromComponentValueToInput(componentValue))
  const [isFocused, setIsFocused] = useState(false)

  const handleUpdate = (path: NestedKey<InputType>) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newInputs = setValue(input, path, event.target.value as any)
    setInput(newInputs)
  }

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    setInput(fromComponentValueToInput(componentValue))
  }, [componentValue])

  // sync inputs -> engine
  useEffect(() => {
    if (isValidInput(input)) {
      const newComponentValue = { ...componentValue, ...fromInputToComponentValue(input) }

      if (isEqual(newComponentValue)) {
        return
      }
      setComponentValue(newComponentValue)
    }
  }, [input])

  // sync engine -> inputs
  useEffect(() => {
    if (isFocused) {
      // skip sync from state while editing, to avoid overriding the user input
      return
    }
    const newInputs = fromComponentValueToInput(componentValue)
    setInput(newInputs)
  }, [componentValue])

  const getProps = useCallback(
    (
      path: NestedKey<InputType>
    ): Pick<InputHTMLAttributes<HTMLElement>, 'value' | 'onChange' | 'onFocus' | 'onBlur'> => {
      const value = getValue(input, path) || ''

      return {
        value: value.toString(),
        onChange: handleUpdate(path),
        onFocus: handleFocus,
        onBlur: handleBlur
      }
    },
    [handleUpdate, handleFocus, handleBlur, input]
  )

  return getProps
}
