import { Coords } from "@dcl/ecs"

type ParcelInfo = {
  min: Coords
  max: Coords
  parcels: Coords[]
}

/* Parcels string format rules:
** #1: each coordinate is space-separated
** #2: each point is comma-separated
** EX: "0,0 0,1 1,0 1,1"
*/
export function getSceneParcelInfo(parcels: string): ParcelInfo {
  const base: { min: Coords, max: Coords } = {
    min: { x: Infinity, y: Infinity },
    max: { x: -Infinity, y: -Infinity }
  }
  const _parcels = parcels.split(' ').map((parcel) => {
    const [x, y] = parcel.split(',').map(($) => parseInt($))

    if (base.min.y >= y) {
      base.min = { x: Math.min(base.min.x, x), y }
    }

    if (y >= base.max.y) {
      base.max = { x: Math.max(base.max.x, x), y }
    }

    return { x, y }
  })

  return { min: base.min, max: base.max, parcels: _parcels }
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

export function getCoordinatesInGridOrder(coords: Coords[]): Coords[] {
  // avoid mutating original coords...
  return [...coords].sort((a, b) => {
    // first, sort by y-coordinate in descending order
    if (a.y !== b.y) return b.y - a.y
    // If y-coordinates are the same, sort by x-coordinate in ascending order
    return a.x - b.x
  })
}
