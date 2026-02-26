import * as components from '../components'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas'
import { isZeroVector, normalizeVector, scaleVector, addVectors } from '../runtime/helpers'

/**
 * @internal
 */
interface PhysicsImpulseHelper {
  applyImpulseToPlayer(vector: Vector3Type, magnitude?: number): void
}

/** @internal */
export function createPhysicsImpulseHelper(engine: IEngine): PhysicsImpulseHelper {
  const PhysicsCombinedImpulse = components.PhysicsCombinedImpulse(engine)
  const EngineInfo = components.EngineInfo(engine)

  let impulseEventId = 0
  let lastWrittenEventId = 0
  let lastWrittenTick = -1

  function applyImpulseToPlayer(vector: Vector3Type, magnitude?: number): void {
    let finalVector: Vector3Type

    if (typeof magnitude === 'number') {
      if (isZeroVector(vector)) return
      finalVector = scaleVector(normalizeVector(vector), magnitude)
    } else {
      if (isZeroVector(vector)) return
      finalVector = vector
    }

    const currentTick = EngineInfo.getOrNull(engine.RootEntity)?.tickNumber ?? 0
    const existing = PhysicsCombinedImpulse.getOrNull(engine.PlayerEntity)

    if (existing && existing.eventId !== lastWrittenEventId && lastWrittenEventId !== 0) {
      throw new Error(
        'PBPhysicsCombinedImpulse was modified outside Physics helper. ' +
        'Do not mix direct component access with Physics.applyImpulseToPlayer().'
      )
    }

    if (lastWrittenTick === currentTick && existing) {
      finalVector = addVectors(existing.vector ?? { x: 0, y: 0, z: 0 }, finalVector)
    } else {
      lastWrittenEventId = ++impulseEventId
    }

    lastWrittenTick = currentTick

    PhysicsCombinedImpulse.createOrReplace(engine.PlayerEntity, {
      vector: finalVector,
      eventId: lastWrittenEventId
    })
  }

  return { applyImpulseToPlayer }
}
