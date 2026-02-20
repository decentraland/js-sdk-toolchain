import { Vector3Type } from '../schemas/custom/Vector3'

/**
 * @public
 * Coordinate space for interpreting the force/impulse vector.
 * String enum to avoid ambiguity with the (direction, magnitude, space?) overload.
 */
export enum PhysicsForceSpace {
  PFS_WORLD = 'world',
  PFS_LOCAL = 'local'
}

/** @internal */
export function isZeroVector(v: Vector3Type): boolean {
  return v.x === 0 && v.y === 0 && v.z === 0
}

/** @internal */
export function normalizeVector(v: Vector3Type): Vector3Type {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (len === 0) return { x: 0, y: 0, z: 0 }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

/** @internal */
export function scaleVector(v: Vector3Type, s: number): Vector3Type {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

/** @internal */
export function addVectors(a: Vector3Type, b: Vector3Type): Vector3Type {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

/** @internal */
export function vectorsEqual(a: Vector3Type, b: Vector3Type): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z
}
