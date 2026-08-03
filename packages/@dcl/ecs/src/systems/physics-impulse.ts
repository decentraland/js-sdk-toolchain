import * as components from '../components'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas'
import { Vector3 } from '../runtime/helpers'

/**
 * @public
 * Falloff mode for knockback force over distance.
 */
export enum KnockbackFalloff {
  /** Same force at any distance within radius */
  CONSTANT = 0,
  /** Smooth linear decrease to 0 at radius edge: F = magnitude * (1 - distance / radius) */
  LINEAR = 1,
  /** Sharp drop-off, physically realistic: F = magnitude / (distance^2 + 1) */
  INVERSE_SQUARE = 2
}

/**
 * @internal
 */
export interface PhysicsImpulseHelper {
  applyImpulseToPlayer(vector: Vector3Type, magnitude?: number): void
  applyKnockbackToPlayer(
    fromPosition: Vector3Type,
    magnitude: number,
    radius?: number,
    falloff?: KnockbackFalloff
  ): void
}

/** @internal */
export function createPhysicsImpulseHelper(engine: IEngine): PhysicsImpulseHelper {
  const PhysicsCombinedImpulse = components.PhysicsCombinedImpulse(engine)
  const Transform = components.Transform(engine)
  const EngineInfo = components.EngineInfo(engine)

  let impulseEventId = 0
  let lastWrittenEventId = 0
  let lastWrittenTick = -1

  function applyImpulseToPlayer(vector: Vector3Type, magnitude?: number): void {
    let finalVector: Vector3Type

    if (typeof magnitude === 'number') {
      if (Vector3.equalsToFloats(vector, 0, 0, 0)) return
      finalVector = Vector3.scale(Vector3.normalize(vector), magnitude)
    } else {
      if (Vector3.equalsToFloats(vector, 0, 0, 0)) return
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
      finalVector = Vector3.add(existing.vector ?? { x: 0, y: 0, z: 0 }, finalVector)
    } else {
      lastWrittenEventId = ++impulseEventId
    }

    lastWrittenTick = currentTick

    PhysicsCombinedImpulse.createOrReplace(engine.PlayerEntity, {
      vector: finalVector,
      eventId: lastWrittenEventId
    })
  }

  function applyKnockbackToPlayer(
    fromPosition: Vector3Type,
    magnitude: number,
    radius: number = Infinity,
    falloff: KnockbackFalloff = KnockbackFalloff.CONSTANT
  ): void {
    const diff = Vector3.subtract(Transform.get(engine.PlayerEntity).position, fromPosition)

    if (Vector3.equalsToFloats(diff, 0, 0, 0)) {
      applyImpulseToPlayer({ x: 0, y: magnitude, z: 0 })
      return
    }

    // Fast path: default params — no need to compute distance
    if (radius === Infinity && falloff === KnockbackFalloff.CONSTANT) {
      applyImpulseToPlayer(Vector3.scale(Vector3.normalize(diff), magnitude))
      return
    }

    const distance = Vector3.length(diff)
    if (distance > radius) return

    let effectiveMagnitude: number
    switch (falloff) {
      case KnockbackFalloff.LINEAR:
        effectiveMagnitude = magnitude * (1 - distance / radius)
        break
      case KnockbackFalloff.INVERSE_SQUARE:
        effectiveMagnitude = magnitude / (distance * distance + 1)
        break
      case KnockbackFalloff.CONSTANT:
      default:
        effectiveMagnitude = magnitude
        break
    }

    // normalize(diff) * effectiveMagnitude in one step
    applyImpulseToPlayer(Vector3.scale(diff, effectiveMagnitude / distance))
  }

  return { applyImpulseToPlayer, applyKnockbackToPlayer }
}
