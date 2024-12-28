import { Canvas, createCanvas } from 'canvas'
import { BorderRect } from '@dcl/protocol/out-ts/decentraland/common/border_rect.gen'

enum ParcelType {
  DISTRICT = 'district',
  PLAZA = 'plaza',
  ROAD = 'road',
  OWNED = 'owned',
  NONE = 'none'
}

type ParcelTypeFilter = (parcel: Coord) => ParcelType

// Coord is a string of the format "x,z", with Z+ UP, X+ RIGHT
type Coord = `${number},${number}`

export function getSizesByCoords(parcelStrings: string[][]): BorderRect[] {
  const coordArray = parcelStrings.flat()
  const coords = new Set(coordArray)
  const visited = new Set<Coord>()
  const islands: Coord[][] = []

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ]

  function dfs(coord: Coord, island: Coord[]): void {
    if (!coords.has(coord) || visited.has(coord)) return

    visited.add(coord)
    island.push(coord)

    // Explore all adjacent cells
    for (const [dx, dy] of directions) {
      const [x, y] = coord.split(',').map(Number)
      dfs(`${x + dx},${y + dy}`, island)
    }
  }

  // Find all boxes
  for (const coord of coordArray as Coord[]) {
    if (!visited.has(coord)) {
      const island: Coord[] = []
      dfs(coord, island)
      if (island.length > 0) islands.push(island)
    }
  }

  const sizes: BorderRect[] = islands.map((island) => {
    const coords = island.map((coord) => {
      const [x, y] = coord.split(',').map(Number)
      return { x, y }
    })
    const minX = Math.min(...coords.map((coord) => coord.x))
    const minY = Math.min(...coords.map((coord) => coord.y))
    const maxX = Math.max(...coords.map((coord) => coord.x))
    const maxY = Math.max(...coords.map((coord) => coord.y))
    return {
      top: maxY,
      left: minX,
      right: maxX,
      bottom: minY
    }
  })

  return sizes
}

/**
 * Return the pixel color given the scene type and the top and left masks
 * @param sceneType - The scene type
 * @param topMask - indicates if the scene at the top (Z+1) is part of the same group of parcels
 * @param leftMask - indicates if the scene at the left (X-1) is part of the same group of parcels
 * @returns The pixel color
 */
function getPixelColor(sceneType: ParcelType, topMask: boolean, leftMask: boolean): string {
  let flagR = 0,
    flagG = 0,
    flagB = 0
  if (topMask) flagR |= 0x8
  if (leftMask) flagR |= 0x10
  if (sceneType === ParcelType.DISTRICT) {
    flagG |= 0x20
  } else if (sceneType === ParcelType.ROAD) {
    flagG |= 0x40
  } else if (sceneType === ParcelType.OWNED) {
    flagG |= 0x80
  } else if (sceneType !== ParcelType.PLAZA) {
    flagB = 0x1
  }
  return `rgb(${flagR}, ${flagG}, ${flagB})`
}

export function generateParcelMap(coords: Coord[][] | string[][], parcelTypeFilter?: ParcelTypeFilter): Canvas {
  const allCoords = coords.flat()
  const sizes = getSizesByCoords(coords)
  const maxAbsY = Math.max(
    ...[...sizes.map((size) => Math.abs(size.bottom)), ...sizes.map((size) => Math.abs(size.top))]
  )
  const maxAbsX = Math.max(
    ...[...sizes.map((size) => Math.abs(size.left)), ...sizes.map((size) => Math.abs(size.right))]
  )

  const getSceneType = parcelTypeFilter
    ? parcelTypeFilter
    : (parcel: Coord): ParcelType => {
        if (allCoords.includes(parcel)) return ParcelType.OWNED
        return ParcelType.NONE
      }

  const width = (maxAbsX + 3) * 2
  const height = (maxAbsY + 3) * 2
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = getPixelColor(ParcelType.NONE, false, false)
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const maybeEmpty = new Set<Coord>(
    Array.from(allCoords)
      .map((parcel) => {
        const [x, y] = parcel.split(',').map(Number)
        return [`${x + 1},${y}`, `${x},${y - 1}`] as Coord[]
      })
      .flat()
  )

  for (const thisBlock of coords) {
    for (const parcel of thisBlock) {
      const [x, y] = parcel.split(',').map(Number)
      const topParcel: Coord = `${x},${y + 1}`
      const leftParcel: Coord = `${x - 1},${y}`

      const topMask = thisBlock.includes(topParcel)
      const leftMask = thisBlock.includes(leftParcel)
      const sceneType = getSceneType(parcel as Coord)
      ctx.fillStyle = getPixelColor(sceneType, topMask, leftMask)

      const pixelX = x + width / 2
      const pixelY = height / 2 - y + 1
      ctx.fillRect(pixelX, pixelY, 1, 1)

      maybeEmpty.delete(parcel as Coord)
    }
  }

  return canvas
}
