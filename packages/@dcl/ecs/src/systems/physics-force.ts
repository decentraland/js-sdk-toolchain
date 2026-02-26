import * as components from '../components'
import { Entity } from '../engine'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas'
import { isZeroVector, normalizeVector, scaleVector, addVectors, vectorsEqual } from '../runtime/helpers'

/**
 * @internal
 * Force helper returned by the factory. The facade exposes `applyForceToPlayer`
 * and `removeForceFromPlayer`.
 */
export interface PhysicsForceHelper {
  applyForceToPlayer(source: Entity, vector: Vector3Type, magnitude?: number): void
  removeForceFromPlayer(source: Entity): void
}

/** @internal */
export function createPhysicsForceHelper(engine: IEngine): PhysicsForceHelper {
  const PhysicsCombinedForce = components.PhysicsCombinedForce(engine)

  const forceSources = new Map<Entity, Vector3Type>()
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
    if (!forceSources.has(source)) return
    forceSources.delete(source)
    recalcForce()
  }

  return { applyForceToPlayer, removeForceFromPlayer }
}
