import * as components from '../components'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas/custom/Vector3'
import { isZeroVector, normalizeVector, scaleVector, addVectors } from './physics-common'

/**
 * @internal
 * Impulse helper returned by the factory. The facade exposes `applyImpulseToPlayer`;
 * `advanceFrame` is called by the background system each tick.
 */
export interface PhysicsImpulseHelper {
  applyImpulseToPlayer(dirOrVector: Vector3Type, magnitude?: number): void

  /** Advance the internal frame counter. Called once per tick by the facade system. */
  advanceFrame(): void
}

/** @internal */
export function createPhysicsImpulseHelper(engine: IEngine): PhysicsImpulseHelper {
  const PhysicsTotalImpulse = components.PhysicsTotalImpulse(engine)

  let impulseEventId = 0
  let lastWrittenEventId = 0
  let lastWrittenFrame = -1
  let currentFrame = 0

  function advanceFrame(): void {
    currentFrame++
  }

  function applyImpulseToPlayer(dirOrVector: Vector3Type, magnitude?: number): void {
    let finalVector: Vector3Type

    if (typeof magnitude === 'number') {
      if (isZeroVector(dirOrVector)) return
      finalVector = scaleVector(normalizeVector(dirOrVector), magnitude)
    } else {
      if (isZeroVector(dirOrVector)) return
      finalVector = dirOrVector
    }

    const existing = PhysicsTotalImpulse.getOrNull(engine.PlayerEntity)

    if (existing && existing.eventId !== lastWrittenEventId && lastWrittenEventId !== 0) {
      throw new Error(
        'PBPhysicsTotalImpulse was modified outside Physics helper. ' +
        'Do not mix direct component access with Physics.applyImpulseToPlayer().'
      )
    }

    if (lastWrittenFrame === currentFrame && existing) {
      finalVector = addVectors(existing.vector ?? { x: 0, y: 0, z: 0 }, finalVector)
    } else {
      lastWrittenEventId = ++impulseEventId
    }

    lastWrittenFrame = currentFrame

    PhysicsTotalImpulse.createOrReplace(engine.PlayerEntity, {
      vector: finalVector,
      eventId: lastWrittenEventId
    })
  }

  return { applyImpulseToPlayer, advanceFrame }
}
