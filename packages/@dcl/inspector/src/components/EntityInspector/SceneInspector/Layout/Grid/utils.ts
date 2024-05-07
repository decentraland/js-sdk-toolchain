import { Coords } from '@dcl/ecs'

import { Props } from './types'

/*
** Get the length of the axis (x,y) on the grid
*/
export function getAxisLength(coords: Props['coords']): Coords {
  const [first, last] = [coords[0], coords[coords.length - 1]]
  return {
    x: Math.abs(last.x - first.x) + 1, // zero-based
    y: Math.abs(last.y - first.y) + 1  // zero-based
  }
}

/*
** Get's the axis with the bigger length
*/
export function getLargestAxis(coords: Props['coords']): number {
  const axisLength = getAxisLength(coords)
  return Math.max(axisLength.x, axisLength.y)
}

/*
** Splits coords into chunks of specific size
*/
export function chunkCoords(coords: Props['coords'], chunkSize: number): Props['coords'][] {
  if (chunkSize <= 0 || chunkSize >= coords.length) return [coords]

  const chunks = [];
  for (let i = 0; i < coords.length; i += chunkSize) {
    const tmp = []
    for (let j = i; j < i + chunkSize; j++) {
      tmp.push(coords[j])
    }
    chunks.push(tmp)
  }

  return chunks;
}
