import * as components from '../components'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas/custom/Vector3'
import { getWorldRotation, rotateVectorByQuaternion } from '../runtime/helpers/tree'
import { PhysicsForceSpace, isZeroVector, normalizeVector, scaleVector, addVectors } from './physics-common'

/**
 * @internal
 * Impulse helper returned by the factory. The facade exposes only the public method;
 * `advanceFrame` is called by the background system each tick.
 */
export interface PhysicsImpulseHelper {
  applyImpulseToPlayer(
    dirOrVector: Vector3Type,
    magnitudeOrSpace?: number | PhysicsForceSpace,
    maybeSpace?: PhysicsForceSpace
  ): void

  /** Advance the internal frame counter. Called once per tick by the facade system. */
  advanceFrame(): void
}

/** @internal */
export function createPhysicsImpulseHelper(engine: IEngine): PhysicsImpulseHelper {
  const PhysicsImpulse = components.PhysicsImpulse(engine)

  let impulseTimestamp = 0
  let lastWrittenTimestamp = 0
  let lastWrittenFrame = -1
  let currentFrame = 0

  function advanceFrame(): void {
    currentFrame++
  }

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

  return { applyImpulseToPlayer, advanceFrame }
}
