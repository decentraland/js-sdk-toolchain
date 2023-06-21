export type Coords = {
  x: number
  y: number
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

/**
 * Returns true if the given coords are equal
 */
export function isEqual(p1: Coords, p2: Coords): boolean {
  return p1.x === p2.x && p1.y === p2.y
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
