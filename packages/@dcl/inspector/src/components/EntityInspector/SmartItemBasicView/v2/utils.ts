import { Color4, Color3 } from '@dcl/ecs-math'

import { toColor3, toColor4, toHex } from '../../../ui/ColorField/utils'
import { SectionItem } from './types'

export function applyTransform(value: unknown, transform: SectionItem['transform'], direction: 'in' | 'out'): any {
  if (!transform || !transform[direction] || !transform[direction].steps) {
    return value
  }

  let result = value
  for (const step of transform[direction].steps) {
    try {
      switch (step.op) {
        case 'toString':
          result = String(result)
          break
        case 'toNumber':
          result = Number(result)
          break
        case 'toBoolean':
          result = Boolean(result)
          break
        case 'toFixed':
          if (typeof result === 'number') {
            result = result.toFixed(2)
          }
          break
        case 'parseInt':
          result = parseInt(String(result))
          break
        case 'parseFloat':
          result = parseFloat(String(result))
          break
        case 'toHex':
          result = toHex(result as Color4 | Color3)
          break
        case 'toColor4':
          result = toColor4(result as string)
          break
        case 'toColor3':
          result = toColor3(result as string)
          break
        case 'secondsToMilliseconds':
          result = Number(result) * 1000
          break
        case 'millisecondsToSeconds':
          result = Number(result) / 1000
          break
        default:
          // Unknown operation, keep the value as is
          break
      }
    } catch (error) {
      if (step.onError === 'fail') {
        throw error
      } else if (step.onError === 'skip') {
        // Skip this step, keep previous result
        continue
      }
      // Default is 'noop', keep the value as is
    }
  }
  return result
}
