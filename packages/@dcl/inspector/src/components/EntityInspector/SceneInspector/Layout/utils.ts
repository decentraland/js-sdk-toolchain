import { Coords } from '@dcl/ecs'
import { GridError, TILE_OPTIONS } from './types'
import { parseParcels } from '../utils'

type ParcelInfo = {
  min: Coords
  max: Coords
  length: {
    x: number
    y: number
  }
  parcels: Coords[]
}

const DEFAULT_INFO: ParcelInfo = {
  min: { x: 0, y: 0 },
  max: { x: 0, y: 0 },
  length: { x: 0, y: 0 },
  parcels: []
}

export function getLayoutInfo(parcels: Coords[]): ParcelInfo {
  if (!parcels.length) return DEFAULT_INFO
  const info: { min: Coords; max: Coords } = {
    min: { x: Infinity, y: Infinity },
    max: { x: -Infinity, y: -Infinity }
  }
  parcels.forEach((parcel) => {
    const { x, y } = parcel

    if (info.min.y >= y) {
      info.min = { x: Math.min(info.min.x, x), y }
    }

    if (y >= info.max.y) {
      info.max = { x: Math.max(info.max.x, x), y }
    }

    return { x, y }
  })

  return {
    min: info.min,
    max: info.max,
    length: {
      x: Math.abs(info.max.x) - Math.abs(info.min.x),
      y: Math.abs(info.max.y) - Math.abs(info.min.y)
    },
    parcels
  }
}

/* Parcels string format rules:
 ** #1: each coordinate is space-separated
 ** #2: each point is comma-separated
 ** EX: "0,0 0,1 1,0 1,1"
 */
export function getLayoutInfoFromString(parcels: string): ParcelInfo {
  return getLayoutInfo(parseParcels(parcels))
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
 ** Gets the closest value to parcels options (rounding up in case it doesn't exist)
 */
export function getOption(value: number): number {
  const idx = clampParcels(value) - 1 // zero-based
  return TILE_OPTIONS[idx]?.value ?? 0
}

export function clampParcels(value: number): number {
  return Math.max(0, Math.min(TILE_OPTIONS.length, value))
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
      return 'Number of parcels must be between 1 and 32'
    case GridError.NOT_CONNECTED:
      return 'Parcels have to be connected vertically or horizontally'
    case GridError.MISSING_BASE_PARCEL:
      return 'Base parcel should be also included in parcels list'
    default:
      return ''
  }
}
