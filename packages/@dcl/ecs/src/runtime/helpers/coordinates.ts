export type Coords = {
  x: number
  y: number
}

export function formatCoord(coord: { x: number; y: number } | Coords): string {
  return `${coord.x},${coord.y}`
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
  // Use an iterative DFS to avoid blowing the call stack on large connected parcel sets.
  const visitedSet = new Set<string>()
  const stackToVisit: Coords[] = [parcel]

  while (stackToVisit.length > 0) {
    const currentParcel = stackToVisit.pop() as Coords
    const key = formatCoord(currentParcel)
    const isVisited = visitedSet.has(key)
    if (!isVisited) {
      visitedSet.add(key)
      visited.push(currentParcel)
      const neighbours = getNeighbours(currentParcel.x, currentParcel.y, allParcels)
      for (const n of neighbours) {
        if (!visitedSet.has(formatCoord(n))) stackToVisit.push(n)
      }
    }
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
