import * as components from '../components'
import { Entity } from '../engine'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas'
import { isZeroVector, normalizeVector, scaleVector, addVectors, subtractVectors, vectorLength, vectorsEqual, createTimers } from '../runtime/helpers'
import { KnockbackFalloff } from './physics-impulse'

/**
 * @internal
 */
export interface PhysicsForceHelper {
  applyForceToPlayer(source: Entity, vector: Vector3Type, magnitude?: number): void
  removeForceFromPlayer(source: Entity): void
  applyForceToPlayerForDuration(source: Entity, duration: number, vector: Vector3Type, magnitude?: number): void
  applyRepulsionForceToPlayer(source: Entity, fromPosition: Vector3Type, magnitude: number, radius?: number, falloff?: KnockbackFalloff): void
}

/** @internal */
export function createPhysicsForceHelper(engine: IEngine): PhysicsForceHelper {
  const PhysicsCombinedForce = components.PhysicsCombinedForce(engine)
  const Transform = components.Transform(engine)

  const forceSources = new Map<Entity, Vector3Type>()
  const repulsionSources = new Map<Entity, { fromPosition: Vector3Type, magnitude: number, radius: number, falloff: KnockbackFalloff }>()
  let lastWrittenForceVector: Vector3Type | null = null

  function recalcForce(): void {
    if (forceSources.size === 0) {
      if (PhysicsCombinedForce.getOrNull(engine.PlayerEntity) !== null) {
        PhysicsCombinedForce.deleteFrom(engine.PlayerEntity)
      }
      lastWrittenForceVector = null
      return
    }

    const current = PhysicsCombinedForce.getOrNull(engine.PlayerEntity)
    if (current && lastWrittenForceVector && current.vector) {
      if (!vectorsEqual(current.vector, lastWrittenForceVector)) {
        throw new Error(
          'PBPhysicsCombinedForce was modified outside Physics helper. ' +
          'Do not mix direct component access with Physics.applyForceToPlayer().'
        )
      }
    }

    let sum: Vector3Type = { x: 0, y: 0, z: 0 }
    for (const v of forceSources.values()) {
      sum = addVectors(sum, v)
    }

    PhysicsCombinedForce.createOrReplace(engine.PlayerEntity, { vector: sum })
    lastWrittenForceVector = sum
  }

  function applyForceToPlayer(source: Entity, vector: Vector3Type, magnitude?: number): void {
    let finalVector: Vector3Type

    if (typeof magnitude === 'number') {
      if (isZeroVector(vector)) return
      finalVector = scaleVector(normalizeVector(vector), magnitude)
    } else {
      finalVector = vector
    }

    forceSources.set(source, finalVector)
    recalcForce()
  }

  function removeForceFromPlayer(source: Entity): void {
    repulsionSources.delete(source)
    const timerId = durationTimers.get(source)
    if (timerId !== undefined) {
      timers.clearTimeout(timerId)
      durationTimers.delete(source)
    }
    if (!forceSources.has(source)) return
    forceSources.delete(source)
    recalcForce()
  }

  const timers = createTimers(engine)
  const durationTimers = new Map<Entity, number>()

  function scheduleForceDuration(source: Entity, seconds: number): void {
    const existing = durationTimers.get(source)
    if (existing !== undefined) {
      timers.clearTimeout(existing)
    }

    const timerId = timers.setTimeout(() => {
      durationTimers.delete(source)
      removeForceFromPlayer(source)
    }, seconds * 1000)
    durationTimers.set(source, timerId)
  }

  function applyForceToPlayerForDuration(
    source: Entity,
    duration: number,
    vector: Vector3Type,
    magnitude?: number
  ): void {
    applyForceToPlayer(source, vector, magnitude)
    scheduleForceDuration(source, duration)
  }

  function computeRepulsionVector(
    fromPosition: Vector3Type,
    magnitude: number,
    radius: number,
    falloff: KnockbackFalloff
  ): Vector3Type | null {
    const diff = subtractVectors(Transform.get(engine.PlayerEntity).position, fromPosition)

    if (isZeroVector(diff)) return { x: 0, y: magnitude, z: 0 }

    // Fast path: default params — no need to compute distance
    if (radius === Infinity && falloff === KnockbackFalloff.CONSTANT) {
      return scaleVector(normalizeVector(diff), magnitude)
    }

    const distance = vectorLength(diff)
    if (distance > radius) return null

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

    if (effectiveMagnitude === 0) return null

    // normalize(diff) * effectiveMagnitude in one step
    return scaleVector(diff, effectiveMagnitude / distance)
  }

  function applyRepulsionForceToPlayer(
    source: Entity,
    fromPosition: Vector3Type,
    magnitude: number,
    radius: number = Infinity,
    falloff: KnockbackFalloff = KnockbackFalloff.CONSTANT
  ): void {
    repulsionSources.set(source, { fromPosition, magnitude, radius, falloff })

    const vector = computeRepulsionVector(fromPosition, magnitude, radius, falloff)
    if (vector) {
      forceSources.set(source, vector)
    } else {
      forceSources.delete(source)
    }
    recalcForce()
  }

  // Background system: recalculate repulsion vectors every tick
  engine.addSystem(() => {
    if (repulsionSources.size === 0) return

    for (const [source, { fromPosition, magnitude, radius, falloff }] of repulsionSources) {
      const vector = computeRepulsionVector(fromPosition, magnitude, radius, falloff)
      if (vector) {
        forceSources.set(source, vector)
      } else {
        forceSources.delete(source)
      }
    }

    recalcForce()
  })

  return { applyForceToPlayer, removeForceFromPlayer, applyForceToPlayerForDuration, applyRepulsionForceToPlayer }
}
