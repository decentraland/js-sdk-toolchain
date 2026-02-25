import { Entity } from '../engine/entity'
import { IEngine } from '../engine'
import { SYSTEMS_REGULAR_PRIORITY } from '../engine/systems'
import { Vector3Type } from '../schemas/custom/Vector3'
import { createPhysicsImpulseHelper } from './physics-impulse'
import { createPhysicsForceHelper } from './physics-force'

/**
 * @public
 */
export interface PhysicsSystem {
  /**
   * Apply a one-shot impulse to the player entity.
   * Multiple calls within the same frame are accumulated (summed).
   *
   * @param vector - Combined direction and magnitude vector
   */
  applyImpulseToPlayer(vector: Vector3Type): void

  /**
   * Apply a one-shot impulse to the player entity.
   * Multiple calls within the same frame are accumulated (summed).
   *
   * @param direction - Direction of the impulse (will be normalized)
   * @param magnitude - Strength of the impulse
   */
  applyImpulseToPlayer(direction: Vector3Type, magnitude: number): void

  /**
   * Apply a continuous force to the player from a given source entity.
   * Multiple sources are accumulated: the registry sums all active forces
   * and writes a single PBPhysicsTotalForce component.
   * Calling again with the same source replaces its previous force.
   *
   * @param source - Entity key identifying this force source
   * @param vector - Combined direction and magnitude vector
   */
  applyForceToPlayer(source: Entity, vector: Vector3Type): void

  /**
   * Apply a continuous force to the player from a given source entity.
   * Multiple sources are accumulated: the registry sums all active forces
   * and writes a single PBPhysicsTotalForce component.
   * Calling again with the same source replaces its previous force.
   *
   * @param source - Entity key identifying this force source
   * @param direction - Direction of the force (will be normalized)
   * @param magnitude - Strength of the force
   */
  applyForceToPlayer(source: Entity, direction: Vector3Type, magnitude: number): void

  /**
   * Remove a force source from the registry. The remaining forces are
   * re-summed and the component is updated. If no sources remain the
   * component is deleted. No-op if the source is not registered.
   *
   * @param source - Entity key identifying the force source to remove
   */
  removeForceFromPlayer(source: Entity): void
}

/**
 * @internal
 */
export function createPhysicsSystem(engine: IEngine): PhysicsSystem {
  const impulse = createPhysicsImpulseHelper(engine)
  const force = createPhysicsForceHelper(engine)

  engine.addSystem(
    function PhysicsTickSystem() {
      impulse.advanceFrame()
    },
    SYSTEMS_REGULAR_PRIORITY * 2,
    'dcl.PhysicsTickSystem'
  )

  return {
    applyImpulseToPlayer: impulse.applyImpulseToPlayer,
    applyForceToPlayer: force.applyForceToPlayer,
    removeForceFromPlayer: force.removeForceFromPlayer
  }
}
