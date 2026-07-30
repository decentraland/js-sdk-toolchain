import { Vector3Type } from '../../schemas'

/**
 * Lightweight Vector3 math utilities for internal use.
 * Mirrors the subset of @dcl/ecs-math Vector3 API used by the physics helpers.
 *
 * TEMPORARY WORKAROUND: @dcl/ecs-math ships ESM-only, which breaks the dist-cjs build.
 * The proper fix is to add a CJS build to @dcl/ecs-math upstream, then replace this
 * file with `import { Vector3 } from '@dcl/ecs-math'`.
 *
 * @internal
 */
export const Vector3 = {
  add(a: Vector3Type, b: Vector3Type): Vector3Type {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
  },

  subtract(a: Vector3Type, b: Vector3Type): Vector3Type {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  },

  scale(v: Vector3Type, s: number): Vector3Type {
    return { x: v.x * s, y: v.y * s, z: v.z * s }
  },

  length(v: Vector3Type): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  },

  normalize(v: Vector3Type): Vector3Type {
    const len = Vector3.length(v)
    if (len === 0) return { x: 0, y: 0, z: 0 }
    return { x: v.x / len, y: v.y / len, z: v.z / len }
  },

  equals(a: Vector3Type, b: Vector3Type): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z
  },

  equalsToFloats(v: Vector3Type, x: number, y: number, z: number): boolean {
    return v.x === x && v.y === y && v.z === z
  }
} as const
