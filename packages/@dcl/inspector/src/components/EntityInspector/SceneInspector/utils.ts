import { SceneInput } from './types'
import { EditorComponentsTypes } from '../../../lib/sdk/components'
import { Coords } from '../../../lib/utils/layout'

export function fromScene(value: EditorComponentsTypes['Scene']): SceneInput {
  const parcels = value.layout.parcels.map((parcel) => parcel.x + ',' + parcel.y).join(' ')
  return {
    layout: {
      parcels
    }
  }
}

export function toScene(inputs: SceneInput): EditorComponentsTypes['Scene'] {
  let base: Coords = { x: Infinity, y: Infinity }
  const parcels = Array.from(new Set(inputs.layout.parcels.split(' '))).map((parcel) => {
    const [x, y] = parcel.split(',').map(($) => parseInt($))

    // base should be bottom-left parcel
    // https://docs.decentraland.org/creator/development-guide/sdk7/scene-metadata/#scene-parcels
    if (base.y >= y) {
      base = { x: Math.min(base.x, x), y }
    }

    return { x, y }
  })

  return {
    layout: {
      base,
      parcels
    }
  }
}

function areValidCoords(value: string): boolean {
  const coords = value.split(',')
  return coords.length === 2 && !isNaN(parseInt(coords[0])) && !isNaN(parseInt(coords[1]))
}

export function isValidInput(input: SceneInput): boolean {
  const parcels = input.layout.parcels.split(' ')
  return !!parcels.length && parcels.every(($) => areValidCoords($))
}
