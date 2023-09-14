import { StatesInput } from './types'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

export function fromScene(value: EditorComponentsTypes['States']): StatesInput {
  return value
}

export function toStates(inputs: StatesInput): EditorComponentsTypes['States'] {
  return inputs
}

export function isValidInput(inputs: StatesInput): boolean {
  const set = new Set(inputs.value)
  const array = Array.from(set)
  return array.length === inputs.value.length
}
