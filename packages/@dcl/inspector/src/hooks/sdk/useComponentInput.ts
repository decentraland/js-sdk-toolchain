import { InputHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react'
import { Entity } from '@dcl/ecs'
import { getValue, NestedKey, setValue } from '../../lib/logic/get-set-value'
import { Component } from '../../lib/sdk/components'
import { useComponentValue } from './useComponentValue'

type Input = {
  [key: string]: boolean | string | string[] | any[] | Record<string, boolean | string | string[] | any[] | Input>
}

export function isValidNumericInput(input: Input[keyof Input]): boolean {
  if (typeof input === 'object') {
    return Object.values(input).every((value) => isValidNumericInput(value))
  }
  if (typeof input === 'boolean') {
    return !!input
  }
  return input.length > 0 && !isNaN(Number(input))
}

export const useComponentInput = <ComponentValueType extends object, InputType extends Input>(
  entity: Entity,
  component: Component<ComponentValueType>,
  fromComponentValueToInput: (componentValue: ComponentValueType) => InputType,
  fromInputToComponentValue: (input: InputType) => ComponentValueType,
  validateInput: (input: InputType) => boolean = () => true,
  deps: unknown[] = []
) => {
  const [componentValue, setComponentValue, isEqual] = useComponentValue<ComponentValueType>(entity, component)
  const [input, setInput] = useState<InputType | null>(
    componentValue === null ? null : fromComponentValueToInput(componentValue)
  )
  const [focusedOn, setFocusedOn] = useState<string | null>(null)
  const skipSyncRef = useRef(false)
  const [isValid, setIsValid] = useState(true)

  const updateInputs = useCallback((value: InputType | null, skipSync = false) => {
    skipSyncRef.current = skipSync
    setInput(value)
  }, [])

  const handleUpdate =
    (path: NestedKey<InputType>, getter: (event: React.ChangeEvent<HTMLInputElement>) => any = (e) => e.target.value) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (input === null) return
      const newInputs = setValue(input, path, getter(event))
      updateInputs(newInputs)
    }

  const handleFocus = useCallback(
    (path: NestedKey<InputType>) => () => {
      setFocusedOn(path)
    },
    []
  )

  const handleBlur = useCallback(() => {
    if (componentValue === null) return
    setFocusedOn(null)
    updateInputs(fromComponentValueToInput(componentValue))
  }, [componentValue])

  const validate = useCallback(
    (input: InputType | null): input is InputType => input !== null && validateInput(input),
    [input, ...deps]
  )

  // sync inputs -> engine
  useEffect(() => {
    if (skipSyncRef.current) return
    if (validate(input)) {
      const newComponentValue = { ...componentValue, ...fromInputToComponentValue(input) }
      if (isEqual(newComponentValue)) return

      setComponentValue(newComponentValue)
    }
  }, [input])

  // sync engine -> inputs
  useEffect(() => {
    if (componentValue === null) return

    let newInputs = fromComponentValueToInput(componentValue) as any
    if (focusedOn) {
      // skip sync from state while editing, to avoid overriding the user input
      const current = getValue(input, focusedOn)
      newInputs = setValue(newInputs, focusedOn, current)
    }
    // set "skipSync" to avoid cyclic component value change
    updateInputs(newInputs, true)
  }, [componentValue, ...deps])

  useEffect(() => {
    setIsValid(validate(input))
  }, [input, ...deps])

  const getProps = useCallback(
    (
      path: NestedKey<InputType>,
      getter?: (event: React.ChangeEvent<HTMLInputElement>) => any
    ): Pick<InputHTMLAttributes<HTMLElement>, 'value' | 'onChange' | 'onFocus' | 'onBlur'> => {
      const value = getValue(input, path) || ''

      return {
        value: value.toString(),
        onChange: handleUpdate(path, getter),
        onFocus: handleFocus(path),
        onBlur: handleBlur
      }
    },
    [handleUpdate, handleFocus, handleBlur, input]
  )

  return { getInputProps: getProps, isValid }
}

const mergeComponentValues = <ComponentValueType extends object, InputType extends Input>(
  values: ComponentValueType[],
  fromComponentValueToInput: (componentValue: ComponentValueType) => InputType
): InputType => {
  // Transform all component values to input format
  const inputs = values.map(fromComponentValueToInput)

  // Get first input as reference
  const firstInput = inputs[0]

  // Create result object with same shape as first input
  const result = {} as InputType

  // For each key in first input
  for (const key in firstInput) {
    const firstValue = firstInput[key]

    // Check if all inputs have same value for this key
    const allSame = inputs.every((input) => {
      const value = input[key]
      if (typeof value === 'object' && value !== null) {
        // For objects, compare stringified versions
        return JSON.stringify(value) === JSON.stringify(firstValue)
      }
      return value === firstValue
    })

    // Set result value based on whether all inputs match
    result[key] = allSame ? firstValue : ('--' as any)
  }

  return result
}

export const useComponentInput2 = <ComponentValueType extends object, InputType extends Input>(
  entities: Entity[],
  component: Component<ComponentValueType>,
  fromComponentValueToInput: (componentValue: ComponentValueType) => InputType,
  fromInputToComponentValue: (input: InputType) => ComponentValueType,
  validateInput: (input: InputType) => boolean = () => true,
  deps: unknown[] = []
) => {
  const componentValues = entities.map((entity) => useComponentValue<ComponentValueType>(entity, component))
  const [componentValue, _, isEqual] = componentValues[0]
  const asd = mergeComponentValues(
    componentValues.map(([value]) => value),
    fromComponentValueToInput
  )
  const [input, setInput] = useState<InputType | null>(
    componentValue === null ? null : fromComponentValueToInput(componentValue)
  )
  const [focusedOn, setFocusedOn] = useState<string | null>(null)
  const skipSyncRef = useRef(false)
  const [isValid, setIsValid] = useState(true)

  const updateInputs = useCallback((value: InputType | null, skipSync = false) => {
    skipSyncRef.current = skipSync
    setInput(value)
  }, [])

  const handleUpdate =
    (path: NestedKey<InputType>, getter: (event: React.ChangeEvent<HTMLInputElement>) => any = (e) => e.target.value) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (input === null) return
      const newInputs = setValue(input, path, getter(event))
      updateInputs(newInputs)
    }

  const handleFocus = useCallback(
    (path: NestedKey<InputType>) => () => {
      setFocusedOn(path)
    },
    []
  )

  const handleBlur = useCallback(() => {
    if (componentValue === null) return
    setFocusedOn(null)
    updateInputs(fromComponentValueToInput(componentValue))
  }, [componentValue])

  const validate = useCallback(
    (input: InputType | null): input is InputType => input !== null && validateInput(input),
    [input, ...deps]
  )

  // sync inputs -> engine
  useEffect(() => {
    if (skipSyncRef.current) return
    if (validate(input)) {
      const newComponentValue = { ...componentValue, ...fromInputToComponentValue(input) }
      if (isEqual(newComponentValue)) return

      for (const [_, setComponentValue] of componentValues) {
        setComponentValue(newComponentValue)
      }
    }
  }, [input])

  // sync engine -> inputs
  useEffect(() => {
    if (componentValue === null) return

    let newInputs = fromComponentValueToInput(componentValue) as any
    if (focusedOn) {
      // skip sync from state while editing, to avoid overriding the user input
      const current = getValue(input, focusedOn)
      newInputs = setValue(newInputs, focusedOn, current)
    }
    // set "skipSync" to avoid cyclic component value change
    updateInputs(newInputs, true)
  }, [componentValue, ...deps])

  useEffect(() => {
    setIsValid(validate(input))
  }, [input, ...deps])

  const getProps = useCallback(
    (
      path: NestedKey<InputType>,
      getter?: (event: React.ChangeEvent<HTMLInputElement>) => any
    ): Pick<InputHTMLAttributes<HTMLElement>, 'value' | 'onChange' | 'onFocus' | 'onBlur'> => {
      const value = (getValue(asd, path) || '').toString()

      return {
        value,
        onChange: handleUpdate(path, getter),
        onFocus: handleFocus(path),
        onBlur: handleBlur
      }
    },
    [handleUpdate, handleFocus, handleBlur, input]
  )

  return { getInputProps: getProps, isValid }
}
