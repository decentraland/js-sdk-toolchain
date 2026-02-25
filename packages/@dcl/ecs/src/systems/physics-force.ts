import * as components from '../components'
import { Entity } from '../engine/entity'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas/custom/Vector3'
import { isZeroVector, normalizeVector, scaleVector, addVectors, vectorsEqual } from './physics-common'

/**
 * @internal
 * Force helper returned by the factory. The facade exposes `applyForceToPlayer`
 * and `removeForceFromPlayer`.
 */
export interface PhysicsForceHelper {
  applyForceToPlayer(source: Entity, dirOrVector: Vector3Type, magnitude?: number): void
  removeForceFromPlayer(source: Entity): void
}

/** @internal */
export function createPhysicsForceHelper(engine: IEngine): PhysicsForceHelper {
  const PhysicsTotalForce = components.PhysicsTotalForce(engine)

  const forceSources = new Map<Entity, Vector3Type>()
  let lastWrittenForceVector: Vector3Type | null = null

  function recalcForce(): void {
    if (forceSources.size === 0) {
      if (PhysicsTotalForce.getOrNull(engine.PlayerEntity) !== null) {
        PhysicsTotalForce.deleteFrom(engine.PlayerEntity)
      }
      lastWrittenForceVector = null
      return
    }

    const current = PhysicsTotalForce.getOrNull(engine.PlayerEntity)
    if (current && lastWrittenForceVector && current.vector) {
      if (!vectorsEqual(current.vector, lastWrittenForceVector)) {
        throw new Error(
          'PBPhysicsTotalForce was modified outside Physics helper. ' +
          'Do not mix direct component access with Physics.applyForceToPlayer().'
        )
      }
    }

    let sum: Vector3Type = { x: 0, y: 0, z: 0 }
    for (const v of forceSources.values()) {
      sum = addVectors(sum, v)
    }

    PhysicsTotalForce.createOrReplace(engine.PlayerEntity, { vector: sum })
    lastWrittenForceVector = sum
  }

  function applyForceToPlayer(source: Entity, dirOrVector: Vector3Type, magnitude?: number): void {
    let vector: Vector3Type

    if (typeof magnitude === 'number') {
      if (isZeroVector(dirOrVector)) return
      vector = scaleVector(normalizeVector(dirOrVector), magnitude)
    } else {
      vector = dirOrVector
    }

    forceSources.set(source, vector)
    recalcForce()
  }

  function removeForceFromPlayer(source: Entity): void {
    if (!forceSources.has(source)) return
    forceSources.delete(source)
    recalcForce()
  }

  return { applyForceToPlayer, removeForceFromPlayer }
}
