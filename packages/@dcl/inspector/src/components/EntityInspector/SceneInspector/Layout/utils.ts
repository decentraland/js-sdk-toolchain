import { Coords } from '@dcl/ecs'
import { GridError, TILE_OPTIONS } from './types'
import { parseParcels } from '../utils'

type ParcelInfo = {
  min: Coords
  max: Coords
  parcels: Coords[]
}

export function getLayoutInfo(parcels: Coords[]): ParcelInfo {
  const base: { min: Coords; max: Coords } = {
    min: { x: Infinity, y: Infinity },
    max: { x: -Infinity, y: -Infinity }
  }
  parcels.forEach((parcel) => {
    const { x, y } = parcel

    if (base.min.y >= y) {
      base.min = { x: Math.min(base.min.x, x), y }
    }

    if (y >= base.max.y) {
      base.max = { x: Math.max(base.max.x, x), y }
    }

    return { x, y }
  })

  return { min: base.min, max: base.max, parcels }
}

/* Parcels string format rules:
 ** #1: each coordinate is space-separated
 ** #2: each point is comma-separated
 ** EX: "0,0 0,1 1,0 1,1"
 */
export function getLayoutInfoFromString(parcels: string): ParcelInfo {
  const _parcels = parcels.split(' ').map((parcel) => {
    const [x, y] = parcel.split(',').map(($) => parseInt($))
    return { x, y }
  })
  return getLayoutInfo(_parcels)
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

/*
 ** Sorts the coordinates for grid rendering
 ** This means:
 **  - X-axis => Lowest to highest
 **  - Y-axis => Highest to lowest
 ** EX: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }]
 **  => [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }]
 */
export function getCoordinatesInGridOrder(coords: Coords[]): Coords[] {
  // avoid mutating original coords...
  return [...coords].sort((a, b) => {
    // first, sort by y-coordinate in descending order
    if (a.y !== b.y) return b.y - a.y
    // If y-coordinates are the same, sort by x-coordinate in ascending order
    return a.x - b.x
  })
}

/*
 ** Returns coordinates between "min" and "max" in grid order
 */
export function getCoordinates(min: Coords, max: Coords): Coords[] {
  return getCoordinatesInGridOrder(getCoordinatesBetweenPoints(min, max))
}

/*
 ** Gets the closest value from "TILE_OPTIONS" (rounding up in case it doesn't exist)
 */
export function getOption(value: number): number {
  const idx = clamp(value, 0, TILE_OPTIONS.length) - 1 // zero-based
  return TILE_OPTIONS[idx]?.value ?? 0
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/*
 ** Gets min & max coordinates from grid-ordered coordinates
 */
export function getMinMaxFromOrderedCoords(coords: Coords[]): [Coords, Coords] {
  return [
    { x: coords[0].x, y: coords[coords.length - 1].y },
    { x: coords[coords.length - 1].x, y: coords[0].y }
  ]
}

/*
 ** Transform a coordinate to it's string representation
 */
export function coordToStr({ x, y }: Coords): string {
  return `${x},${y}`
}

/*
 ** Transform a coordinate in it's string representation to a Coord
 */
export function strToCoord(coord: string): Coords {
  const parcels = parseParcels(coord)
  return parcels[0]
}

/*
 ** Filter out the disabled coordinates
 */
export function getEnabledCoords(coords: Coords[], disabledCoords: Set<string>) {
  return coords.filter(($) => !disabledCoords.has(coordToStr($)))
}

/*
 ** Find a specific coordinate in the list of coordinates
 */
export function findCoord(coords: Coords[], needle: Coords) {
  return coords.find(($) => $.x === needle.x && $.y === needle.y)
}

/*
 ** Checks if a specific coordinate is in the list of coordinates
 */
export function hasCoord(coords: Coords[], needle: Coords) {
  return !!findCoord(coords, needle)
}

/*
 ** Transform list of coordinates to their string-representation form and filters the
 ** disabled ones
 */
export function transformCoordsToString(coords: Coords[], disabledCoords: Set<string>) {
  return coords
    .map(($) => coordToStr($)) // map to string
    .filter(($) => !disabledCoords.has($)) // remove disabled coords
    .join(' ')
}

/*
 ** Matches a GridError to a user-friendly message
 */
export function stringifyGridError(error: GridError): string {
  switch (error) {
    case GridError.NUMBER_OF_PARCELS:
      return 'Number of parcels must be between 0 and 32'
    case GridError.NOT_CONNECTED:
      return 'Parcels have to be connected vertically or horizontally'
    case GridError.MISSING_BASE_PARCEL:
      return 'Base parcel should be also included in parcels list'
    default:
      return ''
  }
}
