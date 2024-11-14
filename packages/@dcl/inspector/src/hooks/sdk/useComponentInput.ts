import { InputHTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CrdtMessageType, Entity } from '@dcl/ecs'
import { recursiveCheck as hasDiff } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { getValue, NestedKey, setValue } from '../../lib/logic/get-set-value'
import { Component } from '../../lib/sdk/components'
import { getComponentValue, isLastWriteWinComponent, useComponentValue } from './useComponentValue'
import { useSdk } from './useSdk'
import { useChange } from './useChange'

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
  if (typeof input === 'number') {
    return !isNaN(input)
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

// Helper function to recursively merge values
const mergeValues = (values: any[]): any => {
  // Base case - if any value is not an object, compare directly
  if (!values.every(val => val && typeof val === 'object')) {
    return values.every(val => val === values[0]) ? values[0] : '--' // symbol?
  }

  // Get all keys from all objects
  const allKeys = [...new Set(values.flatMap(Object.keys))]

  // Create result object
  const result: any = {}

  // For each key, recursively merge values
  for (const key of allKeys) {
    const valuesForKey = values.map(obj => obj[key])
    result[key] = mergeValues(valuesForKey)
  }

  return result
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
    const valuesForKey = inputs.map(input => input[key])
    result[key] = mergeValues(valuesForKey)
  }

  return result
}

const getEntityAndComponentValue = <ComponentValueType extends object>(entities: Entity[], component: Component<ComponentValueType>): [Entity, ComponentValueType][] => {
  return entities.map((entity) => [entity, getComponentValue(entity, component) as ComponentValueType])
}

export const useMultiComponentInput = <ComponentValueType extends object, InputType extends Input>(
  entities: Entity[],
  component: Component<ComponentValueType>,
  fromComponentValueToInput: (componentValue: ComponentValueType) => InputType,
  fromInputToComponentValue: (input: InputType) => ComponentValueType,
  validateInput: (input: InputType) => boolean = () => true,
) => {
  // If there's only one entity, use the single entity version just to be safe for now
  if (entities.length === 1) {
    return useComponentInput(
      entities[0],
      component,
      fromComponentValueToInput,
      fromInputToComponentValue,
      validateInput
    )
  }
  const sdk = useSdk()

  // Get initial merged value from all entities
  const initialEntityValues = getEntityAndComponentValue(entities, component)
  const initialMergedValue = useMemo(() =>
    mergeComponentValues(
      initialEntityValues.map(([_, component]) => component),
      fromComponentValueToInput
    ),
    [] // only compute on mount
  )

  const [value, setMergeValue] = useState(initialMergedValue)
  const [isValid, setIsValid] = useState(true)
  const [isFocused, setIsFocused] = useState(false)

  // Handle input updates
  const handleUpdate = useCallback(
    (path: NestedKey<InputType>, getter: (event: React.ChangeEvent<HTMLInputElement>) => any = (e) => e.target.value) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return

      const newValue = setValue(value, path, getter(event))
      if (!hasDiff(value, newValue, 2)) return

      // Only update if component is last-write-win and SDK exists
      if (!isLastWriteWinComponent(component) || !sdk) {
        setMergeValue(newValue)
        return
      }

      // Validate and update all entities
      const entityUpdates = getEntityAndComponentValue(entities, component).map(([entity, componentValue]) => {
        const updatedInput = setValue(fromComponentValueToInput(componentValue as any), path, getter(event))
        const newComponentValue = fromInputToComponentValue(updatedInput)
        return {
          entity,
          value: newComponentValue,
          isValid: validateInput(updatedInput)
        }
      })

      const allUpdatesValid = entityUpdates.every(({ isValid }) => isValid)

      if (allUpdatesValid) {
        entityUpdates.forEach(({ entity, value }) => {
          sdk.operations.updateValue(component, entity, value)
        })
        void sdk.operations.dispatch()
      }

      setMergeValue(newValue)
      setIsValid(allUpdatesValid)
    },
    [value, sdk, component, entities, fromInputToComponentValue, fromComponentValueToInput, validateInput]
  )

  // Sync with engine changes
  useChange(
    (event) => {
      const isRelevantUpdate =
        entities.includes(event.entity) &&
        component.componentId === event.component?.componentId &&
        event.value &&
        event.operation === CrdtMessageType.PUT_COMPONENT

      if (!isRelevantUpdate) return

      const updatedEntityValues = getEntityAndComponentValue(entities, component)
      const newMergedValue = mergeComponentValues(
        updatedEntityValues.map(([_, component]) => component),
        fromComponentValueToInput
      )

      if (!hasDiff(value, newMergedValue, 2) || isFocused) return

      setMergeValue(newMergedValue)
    },
    [entities, component, fromComponentValueToInput, value, isFocused]
  )

  // Input props getter
  const getInputProps = useCallback(
    (
      path: NestedKey<InputType>,
      getter?: (event: React.ChangeEvent<HTMLInputElement>) => any
    ): Pick<InputHTMLAttributes<HTMLElement>, 'value' | 'onChange' | 'onFocus' | 'onBlur'> => ({
      value: (getValue(value, path) || '').toString(),
      onChange: handleUpdate(path, getter),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false)
    }),
    [value, handleUpdate]
  )

  return { getInputProps, isValid }
}
