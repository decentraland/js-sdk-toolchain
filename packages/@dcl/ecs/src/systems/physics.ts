import * as components from '../components'
import { IEngine } from '../engine'
import { SYSTEMS_REGULAR_PRIORITY } from '../engine/systems'
import { Vector3Type } from '../schemas/custom/Vector3'
import { getWorldRotation, rotateVectorByQuaternion } from '../runtime/helpers/tree'

/**
 * @public
 * Coordinate space for interpreting the force/impulse vector.
 * String enum to avoid ambiguity with the (direction, magnitude, space?) overload.
 */
export enum PhysicsForceSpace {
  PFS_WORLD = 'world',
  PFS_LOCAL = 'local'
}

/**
 * @public
 */
export interface PhysicsSystem {
  /**
   * Apply a one-shot impulse to the player entity.
   * Multiple calls within the same frame are accumulated (summed in world space).
   *
   * @param vector - Combined direction and magnitude vector
   * @param space - Coordinate space (default: WORLD)
   */
  applyImpulseToPlayer(vector: Vector3Type, space?: PhysicsForceSpace): void

  /**
   * Apply a one-shot impulse to the player entity.
   * Multiple calls within the same frame are accumulated (summed in world space).
   *
   * @param direction - Direction of the impulse (will be normalized)
   * @param magnitude - Strength of the impulse
   * @param space - Coordinate space (default: WORLD)
   */
  applyImpulseToPlayer(direction: Vector3Type, magnitude: number, space?: PhysicsForceSpace): void
}

function isZeroVector(v: Vector3Type): boolean {
  return v.x === 0 && v.y === 0 && v.z === 0
}

function normalizeVector(v: Vector3Type): Vector3Type {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (len === 0) return { x: 0, y: 0, z: 0 }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function scaleVector(v: Vector3Type, s: number): Vector3Type {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function addVectors(a: Vector3Type, b: Vector3Type): Vector3Type {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

/**
 * @internal
 */
export function createPhysicsSystem(engine: IEngine): PhysicsSystem {
  const PhysicsImpulse = components.PhysicsImpulse(engine)

  let impulseTimestamp = 0
  let lastWrittenTimestamp = 0
  let lastWrittenFrame = -1
  let currentFrame = 0

  engine.addSystem(
    function PhysicsFrameTracker() {
      currentFrame++
    },
    SYSTEMS_REGULAR_PRIORITY * 2,
    'dcl.PhysicsFrameTracker'
  )

  function applyImpulseToPlayer(
    dirOrVector: Vector3Type,
    magnitudeOrSpace?: number | PhysicsForceSpace,
    maybeSpace?: PhysicsForceSpace
  ): void {
    let finalDirection: Vector3Type
    let space: PhysicsForceSpace

    if (typeof magnitudeOrSpace === 'number') {
      if (isZeroVector(dirOrVector)) return
      finalDirection = scaleVector(normalizeVector(dirOrVector), magnitudeOrSpace)
      space = maybeSpace ?? PhysicsForceSpace.PFS_WORLD
    } else {
      if (isZeroVector(dirOrVector)) return
      finalDirection = dirOrVector
      space = magnitudeOrSpace ?? PhysicsForceSpace.PFS_WORLD
    }

    if (space === PhysicsForceSpace.PFS_LOCAL) {
      const playerRotation = getWorldRotation(engine, engine.PlayerEntity)
      finalDirection = rotateVectorByQuaternion(finalDirection, playerRotation)
    }

    const existing = PhysicsImpulse.getOrNull(engine.PlayerEntity)

    if (existing && existing.timestamp !== lastWrittenTimestamp && lastWrittenTimestamp !== 0) {
      throw new Error(
        'PBPhysicsImpulse was modified outside Physics helper. ' +
        'Do not mix direct component access with Physics.applyImpulseToPlayer().'
      )
    }

    if (lastWrittenFrame === currentFrame && existing) {
      finalDirection = addVectors(existing.direction ?? { x: 0, y: 0, z: 0 }, finalDirection)
    } else {
      lastWrittenTimestamp = ++impulseTimestamp
    }

    lastWrittenFrame = currentFrame

    PhysicsImpulse.createOrReplace(engine.PlayerEntity, {
      direction: finalDirection,
      timestamp: lastWrittenTimestamp
    })
  }

  return {
    applyImpulseToPlayer
  }
}
