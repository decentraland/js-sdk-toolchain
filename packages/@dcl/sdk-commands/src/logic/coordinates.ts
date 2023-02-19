export interface IBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type Coords = {
  x: number
  y: number
}

/**
 * Returns metaverse coordinates bounds.
 * TODO: use functions from @dcl/schemas
 */
export function getBounds(): IBounds {
  return {
    minX: -150,
    minY: -150,
    maxX: 165,
    maxY: 165
  }
}

/**
 * Parses a string-based set of coordinates.
 * - All spaces are removed
 * - Leading zeroes are removed
 * - `-0` is converted to `0`
 * @param coordinates An string containing coordinates in the `x,y; x,y; ...` format
 */
export function parse(coordinates: string): string[] {
  return coordinates.split(';').map((coord: string) => {
    const [x, y] = coord.split(',').map(($) => {
      return parseInt($, 10)
        .toString() // removes spaces :)
        .replace('-0', '0')
        .replace(/undefined|NaN/g, '0')
    })
    return `${x},${y}`
  })
}

/**
 * Converts a string-based set of coordinates to an object
 * @param coords A string containing a set of coordinates
 */
export function getObject(coords: string): Coords {
  const [x, y] = parse(coords)[0].split(',')
  return { x: parseInt(x.toString(), 10), y: parseInt(y.toString(), 10) }
}

/**
 * Returns true if the given coordinates are in metaverse bounds
 */
export function inBounds(x: number, y: number): boolean {
  const { minX, minY, maxX, maxY } = getBounds()
  return x >= minX && x <= maxX && y >= minY && y <= maxY
}

/**
 * Returns true if the given parcels array are connected
 */
export function areConnected(parcels: Coords[]): boolean {
  if (parcels.length === 0) {
    return false
  }
  const visited = visitParcel(parcels[0], parcels)
  return visited.length === parcels.length
}

function visitParcel(parcel: Coords, allParcels: Coords[], visited: Coords[] = []): Coords[] {
  const isVisited = visited.some((visitedParcel) => isEqual(visitedParcel, parcel))
  if (!isVisited) {
    visited.push(parcel)
    const neighbours = getNeighbours(parcel.x, parcel.y, allParcels)
    neighbours.forEach((neighbours) => visitParcel(neighbours, allParcels, visited))
  }
  return visited
}

function getIsNeighbourMatcher(x: number, y: number) {
  return (coords: Coords) =>
    (coords.x === x && (coords.y + 1 === y || coords.y - 1 === y)) ||
    (coords.y === y && (coords.x + 1 === x || coords.x - 1 === x))
}

function getNeighbours(x: number, y: number, parcels: Coords[]): Coords[] {
  return parcels.filter(getIsNeighbourMatcher(x, y))
}

export function isEqual(p1: Coords, p2: Coords): boolean {
  return p1.x === p2.x && p1.y === p2.y
}
