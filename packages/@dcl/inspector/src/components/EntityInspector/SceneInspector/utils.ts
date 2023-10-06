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

export function toSceneAuto(inputs: SceneInput): EditorComponentsTypes['Scene'] {
  const parcels = parseParcels(inputs.layout.parcels)
  const points = getCoordinatesBetweenPoints(parcels[0], parcels[1])
  return {
    layout: {
      base: points[0],
      parcels: points
    }
  }
}

export function parseParcels(value: string): Coords[] {
  const parcels = value.split(' ')
  const coordsList: Coords[] = []

  for (const parcel of parcels) {
    const coords = parcel.split(',')
    const x = parseInt(coords[0])
    const y = parseInt(coords[1])
    if (coords.length !== 2 || isNaN(x) || isNaN(y)) return []
    coordsList.push({ x, y })
  }

  return coordsList
}

export function getInputValidation(auto?: boolean) {
  return function isValidInput(input: SceneInput): boolean {
    const parcels = parseParcels(input.layout.parcels)
    return auto ? parcels.length === 2 : areConnected(parcels)
  }
}

export function getCoordinatesBetweenPoints(pointA: Coords, pointB: Coords): Coords[] {
  const coordinates: Coords[] = []

  // ensure pointA is the bottom-left coord
  if (pointA.x > pointB.x) {
    ;[pointA.x, pointB.x] = [pointB.x, pointA.x]
  }
  if (pointA.y > pointB.y) {
    ;[pointA.y, pointB.y] = [pointB.y, pointA.y]
  }

  for (let x = pointA.x; x <= pointB.x; x++) {
    for (let y = pointA.y; y <= pointB.y; y++) {
      coordinates.push({ x, y })
    }
  }

  return coordinates
}
