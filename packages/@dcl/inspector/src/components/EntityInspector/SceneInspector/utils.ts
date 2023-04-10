import { SceneInput } from './types'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

export function fromScene(value: EditorComponentsTypes['scene']): SceneInput {
  const base = value.layout.base.x + ',' + value.layout.base.y
  const parcels = value.layout.parcels.map((parcel) => parcel.x + ',' + parcel.y).join(' ')
  return {
    layout: {
      base,
      parcels
    }
  }
}

export function toScene(inputs: SceneInput): EditorComponentsTypes['scene'] {
  const base = inputs.layout.base.split(',')
  return {
    layout: {
      base: {
        x: parseInt(base[0]),
        y: parseInt(base[1])
      },
      parcels: Array.from(new Set(inputs.layout.parcels.split(' '))).map((parcel) => {
        const coords = parcel.split(',')
        return {
          x: parseInt(coords[0]),
          y: parseInt(coords[1])
        }
      })
    }
  }
}

function areValidCoords(value: string): boolean {
  const coords = value.split(',')
  return coords.length === 2 && !isNaN(parseInt(coords[0])) && !isNaN(parseInt(coords[1]))
}

export function isValidInput(input: SceneInput): boolean {
  return areValidCoords(input.layout.base) && input.layout.parcels.split(' ').every(areValidCoords)
}
