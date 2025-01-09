import { Coords } from '@dcl/ecs'
import { GridError, TILE_OPTIONS } from './types'
import { parseParcels } from '../utils'

export type GridCoord = Coords & { disabled?: boolean }

export type GridInfo = {
  min: Coords
  max: Coords
  length: Coords
  grid: GridCoord[]
}

const DEFAULT_INFO = {
  min: { x: 0, y: 0 },
  max: { x: 0, y: 0 },
  length: { x: 0, y: 0 },
  grid: []
}

export function getGridInfo(parcels: Coords[]): GridInfo {
  if (!parcels.length) return DEFAULT_INFO

  const minParcel = { x: Infinity, y: Infinity }
  const maxParcel = { x: -Infinity, y: -Infinity }

  const coordSet = new Set<string>()

  parcels.forEach((parcel) => {
    // get min parcel
    minParcel.x = Math.min(parcel.x, minParcel.x)
    minParcel.y = Math.min(parcel.y, minParcel.y)

    // get max parcel
    maxParcel.x = Math.max(parcel.x, maxParcel.x)
    maxParcel.y = Math.max(parcel.y, maxParcel.y)

    // push stringified coord to coordSet
    coordSet.add(coordToStr(parcel))
  })

  const coordinatesInOrder = generateCoordinatesBetweenPoints(minParcel, maxParcel).map(($) => ({
    ...$,
    disabled: !coordSet.has(coordToStr($))
  }))

  return {
    min: minParcel,
    max: maxParcel,
    length: {
      x: Math.abs(maxParcel.x) - Math.abs(minParcel.x),
      y: Math.abs(maxParcel.y) - Math.abs(minParcel.y)
    },
    grid: coordinatesInOrder
  }
}

/**
 * Generates an array of coordinates between two points (inclusive).
 * The coordinates are generated in grid order, from top-left to bottom-right,
 * starting from the maximum y-value to the minimum y-value, and within each row,
 * from the minimum x-value to the maximum x-value.
 *
 * @param {Coords} pointA - The first point (can be any of the two corners of the grid).
 * @param {Coords} pointB - The second point (can be any of the two corners of the grid).
 * @returns {Coords[]} - An array of coordinates between the two points, inclusive,
 * ordered from top-left to bottom-right.
 */
export function generateCoordinatesBetweenPoints(pointA: Coords, pointB: Coords): Coords[] {
  const coordinates: Coords[] = []

  const [minX, maxX] = [Math.min(pointA.x, pointB.x), Math.max(pointA.x, pointB.x)]
  const [minY, maxY] = [Math.min(pointA.y, pointB.y), Math.max(pointA.y, pointB.y)]

  for (let y = maxY; y >= minY; y--) {
    for (let x = minX; x <= maxX; x++) {
      const coord = { x, y }
      coordinates.push(coord)
    }
  }

  return coordinates
}

/**
 * Generates a grid of coordinates between the specified min and max points.
 * Marks coordinates as "disabled" based on the provided grid's existing disabled coordinates.
 *
 * @param {GridCoord[]} grid - The existing grid of coordinates, some of which may be disabled.
 * @param {Coords} min - The minimum coordinate point (bottom-left) to define the grid bounds.
 * @param {Coords} max - The maximum coordinate point (top-right) to define the grid bounds.
 * @returns {GridCoord[]} - A new grid of coordinates between the min and max points,
 * with coordinates marked as disabled if they exist as disabled in the original grid.
 */
export function generateGridFrom(grid: GridCoord[], min: Coords, max: Coords): GridCoord[] {
  const disabledCoords = new Set(grid.filter((coord) => coord.disabled).map((coord) => coordToStr(coord)))

  return generateCoordinatesBetweenPoints(min, max).map((coord) => {
    const coordStr = coordToStr(coord)
    return {
      ...coord,
      disabled: disabledCoords.has(coordStr)
    }
  })
}

/* Parcels string format rules:
 ** #1: each coordinate is space-separated
 ** #2: each point is comma-separated
 ** EX: "0,0 0,1 1,0 1,1"
 */
export function getLayoutInfoFromString(parcels: string): GridInfo {
  return getGridInfo(parseParcels(parcels))
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
  if (!coords.length) {
    return [
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ]
  }

  const first = coords[0]
  const last = coords[coords.length - 1]
  return [
    { x: first.x, y: last.y },
    { x: last.x, y: first.y }
  ]
}

/**
 * Converts a coordinate object to its string representation.
 * @param {Coords} coords - The coordinate object.
 * @returns {string} The string representation of the coordinates.
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
export function getEnabledCoords(coords: GridCoord[]) {
  return coords.filter(($) => $.disabled === false)
}

/*
 ** Returns true if the two coords are equal
 */
export function isCoord(coord1: Coords, coord2: Coords): boolean {
  return coord1.x === coord2.x && coord1.y === coord2.y
}

/*
 ** Find a specific coordinate in the list of coordinates
 */
export function findCoord(coords: Coords[], needle: Coords) {
  return coords.find(($) => isCoord($, needle))
}

/*
 ** Checks if a specific coordinate is in the list of coordinates
 */
export function hasCoord(coords: Coords[], needle: Coords) {
  return !!findCoord(coords, needle)
}

/*
 ** Transform list of coordinates to their string-representation form
 */
export function transformCoordsToString(coords: Coords[]) {
  return coords
    .map(($) => coordToStr($)) // map to string
    .join(' ')
}

/*
 ** Matches a GridError to a user-friendly message
 */
export function stringifyGridError(error: GridError): string {
  switch (error) {
    case GridError.NUMBER_OF_PARCELS:
      return 'At least 1 parcel must be included'
    case GridError.NOT_CONNECTED:
      return 'Your layout cannot include isolated parcels. Parcels must be connected horizontally or vertically.'
    case GridError.MISSING_BASE_PARCEL:
      return 'Base parcel should be included in parcels list'
    default:
      return ''
  }
}
