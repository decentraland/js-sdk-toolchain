export type Coords = {
  x: number
  y: number
}

/** Returns a string representation of the given coordinates in the format "x,y" */
function formatCoord(coord: { x: number; y: number }): string {
  return `${coord.x},${coord.y}`
}

/**
 * Returns true if the given parcels array are connected
 */
export function areConnected(parcels: Coords[]): boolean {
  if (parcels.length === 0) {
    return false
  }
  const visited = visitConnectedParcels(parcels[0], parcels)
  return visited.size === parcels.length
}

/**
 * Returns true if the given coords are equal
 */
export function isEqual(p1: Coords, p2: Coords): boolean {
  return p1.x === p2.x && p1.y === p2.y
}

/**
 * Returns the list of connected parcels starting from the given parcel.
 * @param parcel - The starting parcel to visit
 * @param allParcels - The list of all parcels to consider for connectivity
 * @returns The list of connected parcels starting from the given parcel
 * @remarks This function uses an iterative depth-first search (DFS) approach to avoid blowing the call stack on large connected parcel sets.
 */
function visitConnectedParcels(parcel: Coords, allParcels: Coords[]): Set<string> {
  const allParcelsSet = new Set(allParcels.map(formatCoord))
  const visitedSet = new Set<string>()
  const stackToVisit: Coords[] = [parcel]

  while (stackToVisit.length > 0) {
    const currentParcel = stackToVisit.pop() as Coords
    const key = formatCoord(currentParcel)
    const isVisited = visitedSet.has(key)
    if (!isVisited) {
      visitedSet.add(key)
      const neighbours = getNeighbours(currentParcel.x, currentParcel.y, allParcelsSet)
      for (const n of neighbours) {
        if (!visitedSet.has(formatCoord(n))) stackToVisit.push(n)
      }
    }
  }
  return visitedSet
}

function getNeighbours(x: number, y: number, parcels: Set<string>): Coords[] {
  const neighbourCandidates = [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ]
  return neighbourCandidates.filter((c) => parcels.has(formatCoord(c)))
}
