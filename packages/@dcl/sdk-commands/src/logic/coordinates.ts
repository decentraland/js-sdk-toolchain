import { Coords } from '@dcl/ecs/dist-cjs'

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
