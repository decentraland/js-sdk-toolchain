import { areConnected } from '@dcl/ecs'
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

export function isValidInput(input: SceneInput): boolean {
  const parcels = input.layout.parcels.split(' ')
  const coordsList: Coords[] = []

  for (const parcel of parcels) {
    const coords = parcel.split(',')
    const x = parseInt(coords[0])
    const y = parseInt(coords[1])
    if (coords.length !== 2 || isNaN(x) || isNaN(y)) return false
    coordsList.push({ x, y })
  }

  return areConnected(coordsList)
}
