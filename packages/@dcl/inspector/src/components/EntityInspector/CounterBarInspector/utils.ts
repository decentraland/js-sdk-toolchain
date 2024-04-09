import { CounterBar } from '@dcl/asset-packs'
import { CounterBarInput } from './types'

export function fromCounterBar(counter: CounterBar): CounterBarInput {
  return {
    primaryColor: counter.primaryColor || '#00FF00',
    secondaryColor: counter.secondaryColor || '#FF0000',
    maxValue: counter.maxValue ? counter.maxValue.toString() : '100'
  }
}

export function toCounterBar(input: CounterBarInput): CounterBar {
  return {
    primaryColor: input.primaryColor.toUpperCase(),
    secondaryColor: input.secondaryColor.toUpperCase(),
    maxValue: parseFloat(input.maxValue)
  }
}

export function isValidInput(inputs: CounterBarInput): boolean {
  if (isNaN(parseFloat(inputs.maxValue))) {
    return false
  }
  return true
}
