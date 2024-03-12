import { CounterBar } from '@dcl/asset-packs'
import { CounterBarInput } from './types'

export function fromCounterBar(counter: CounterBar): CounterBarInput {
  return { ...counter, value: 'asd' }
}

export function toCounterBar(input: CounterBarInput): CounterBar {
  return {
    ...input,
    maxValue: 100,
    color: {
      r: 0,
      g: 0,
      b: 0
    }
  }
}

export function isValidInput(_inputs: CounterBarInput): boolean {
  return true
}
