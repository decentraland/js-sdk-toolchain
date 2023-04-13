import { Vector3 } from '@babylonjs/core'
import { PARCEL_SIZE } from './scene'

export type Coords = {
  x: number
  y: number
}

export type Layout = {
  base: Coords
  parcels: Coords[]
}

export function inBounds(layout: Layout, position: Vector3) {
  const { base, parcels } = layout
  const x = Math.floor(position.x / PARCEL_SIZE) + base.x
  const y = Math.floor(position.z / PARCEL_SIZE) + base.y
  return parcels.some((parcel) => parcel.x === x && parcel.y === y)
}
