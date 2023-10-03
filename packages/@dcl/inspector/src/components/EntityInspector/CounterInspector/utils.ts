import { Counter } from '@dcl/asset-packs'
import { CounterInput } from './types'

export function fromCounter(counter: Counter): CounterInput {
  return { ...counter, id: counter.id.toString(), value: counter.value.toString() }
}

export function toCounter(input: CounterInput): Counter {
  return {
    ...input,
    id: parseInt(input.id),
    value: parseInt(input.value)
  }
}

export function isValidInput(inputs: CounterInput): boolean {
  const numeric = parseInt(inputs.value)
  return !isNaN(numeric)
}
