import * as components from '../components'
import { Entity } from '../engine/entity'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas/custom/Vector3'
import { getWorldRotation, rotateVectorByQuaternion } from '../runtime/helpers/tree'
import { PhysicsForceSpace, isZeroVector, normalizeVector, scaleVector, addVectors, vectorsEqual } from './physics-common'

type ForceEntry = { vector: Vector3Type; space: PhysicsForceSpace }

/**
 * @internal
 * Force helper returned by the factory. The facade exposes the public methods;
 * `hasLocalSources` and `recalcForce` are used by the background system.
 */
export interface PhysicsForceHelper {
  applyForceToPlayer(
    source: Entity,
    dirOrVector: Vector3Type,
    magnitudeOrSpace?: number | PhysicsForceSpace,
    maybeSpace?: PhysicsForceSpace
  ): void

  removeForceFromPlayer(source: Entity): void

  /** True when at least one source uses LOCAL space, requiring per-tick recalc. */
  readonly hasLocalSources: boolean

  /** Recompute the summed force vector. Called by the facade system each tick when hasLocalSources. */
  recalcForce(): void
}

/** @internal */
export function createPhysicsForceHelper(engine: IEngine): PhysicsForceHelper {
  const PhysicsForce = components.PhysicsForce(engine)

  const forceSources = new Map<Entity, ForceEntry>()
  let _hasLocalSources = false
  let lastWrittenForceDirection: Vector3Type | null = null

  function toWorldVector(entry: ForceEntry): Vector3Type {
    if (entry.space === PhysicsForceSpace.PFS_LOCAL) {
      const playerRotation = getWorldRotation(engine, engine.PlayerEntity)
      return rotateVectorByQuaternion(entry.vector, playerRotation)
    }
    return entry.vector
  }

  function recalcForce(): void {
    if (forceSources.size === 0) {
      if (PhysicsForce.getOrNull(engine.PlayerEntity) !== null) {
        PhysicsForce.deleteFrom(engine.PlayerEntity)
      }
      lastWrittenForceDirection = null
      return
    }

    const current = PhysicsForce.getOrNull(engine.PlayerEntity)
    if (current && lastWrittenForceDirection && current.direction) {
      if (!vectorsEqual(current.direction, lastWrittenForceDirection)) {
        throw new Error(
          'PBPhysicsForce was modified outside Physics helper. ' +
          'Do not mix direct component access with Physics.applyForceToPlayer().'
        )
      }
    }

    let sum: Vector3Type = { x: 0, y: 0, z: 0 }
    for (const entry of forceSources.values()) {
      sum = addVectors(sum, toWorldVector(entry))
    }

    PhysicsForce.createOrReplace(engine.PlayerEntity, { direction: sum })
    lastWrittenForceDirection = sum
  }

  function updateHasLocalSources(): void {
    _hasLocalSources = false
    for (const entry of forceSources.values()) {
      if (entry.space === PhysicsForceSpace.PFS_LOCAL) {
        _hasLocalSources = true
        return
      }
    }
  }

  function applyForceToPlayer(
    source: Entity,
    dirOrVector: Vector3Type,
    magnitudeOrSpace?: number | PhysicsForceSpace,
    maybeSpace?: PhysicsForceSpace
  ): void {
    let vector: Vector3Type
    let space: PhysicsForceSpace

    if (typeof magnitudeOrSpace === 'number') {
      if (isZeroVector(dirOrVector)) {
        vector = dirOrVector
      } else {
        vector = scaleVector(normalizeVector(dirOrVector), magnitudeOrSpace)
      }
      space = maybeSpace ?? PhysicsForceSpace.PFS_WORLD
    } else {
      vector = dirOrVector
      space = magnitudeOrSpace ?? PhysicsForceSpace.PFS_WORLD
    }

    forceSources.set(source, { vector, space })
    updateHasLocalSources()
    recalcForce()
  }

  function removeForceFromPlayer(source: Entity): void {
    if (!forceSources.has(source)) return
    forceSources.delete(source)
    updateHasLocalSources()
    recalcForce()
  }

  return {
    applyForceToPlayer,
    removeForceFromPlayer,
    get hasLocalSources() {
      return _hasLocalSources
    },
    recalcForce
  }
}
