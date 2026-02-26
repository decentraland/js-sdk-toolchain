import { Entity } from '../engine'
import { IEngine } from '../engine'
import { Vector3Type } from '../schemas'
import { createPhysicsImpulseHelper, KnockbackFalloff } from './physics-impulse'
import { createPhysicsForceHelper } from './physics-force'

export { KnockbackFalloff } from './physics-impulse'

/**
 * @public
 */
export interface PhysicsSystem {
  /**
   * Apply a one-shot impulse to the player entity.
   * Multiple calls within the same frame are accumulated (summed).
   *
   * @param vector - a single `vector` whose length encodes the strength.
   * or use overload for `direction` with a separate `magnitude` — the direction will be normalized before scaling.
   */
  applyImpulseToPlayer(vector: Vector3Type): void
  applyImpulseToPlayer(direction: Vector3Type, magnitude: number): void

  /**
   * Apply a continuous force to the player from a given source entity.
   * Multiple sources are accumulated: the registry sums all active forces
   * and writes a single PBPhysicsCombinedForce component.
   * Calling again with the same source replaces its previous force.
   *
   * @param source - Entity key identifying this force source
   * @param vector - single `vector` whose length encodes the strength
   * or use overload for `direction` with a separate `magnitude` — the direction will be normalized before scaling.
   */
  applyForceToPlayer(source: Entity, vector: Vector3Type): void
  applyForceToPlayer(source: Entity, direction: Vector3Type, magnitude: number): void

  /**
   * Remove a continuous force from the player. Remaining sources are
   * re-summed; if none remain the force is cleared. No-op if the source
   * is not registered.
   *
   * @param source - Entity key identifying the force source to remove
   */
  removeForceFromPlayer(source: Entity): void

  /**
   * Push the player away from a point. Computes direction from
   * `fromPosition` to the player, applies falloff, and delegates
   * to applyImpulseToPlayer.
   *
   * If the player is exactly at `fromPosition`, pushes upward.
   *
   * @param fromPosition - world-space origin of the knockback (explosion center, enemy position, etc.)
   * @param magnitude - base impulse strength
   * @param radius - max distance of effect (default: Infinity)
   * @param falloff - how force decreases with distance (default: CONSTANT)
   */
  applyKnockbackToPlayer(fromPosition: Vector3Type, magnitude: number, radius?: number, falloff?: KnockbackFalloff): void

  /**
   * Apply a continuous force to the player for a limited duration.
   * After `duration` seconds the force is automatically removed.
   * Calling again with the same source resets the timer.
   *
   * @param source - Entity key identifying this force source
   * @param duration - how long the force lasts, in seconds
   * @param vector - single `vector` whose length encodes the strength
   * or use overload for `direction` with a separate `magnitude` — the direction will be normalized before scaling.
   */
  applyForceToPlayerForDuration(source: Entity, duration: number, vector: Vector3Type): void
  applyForceToPlayerForDuration(source: Entity, duration: number, direction: Vector3Type, magnitude: number): void
}

/**
 * @internal
 */
export function createPhysicsSystem(engine: IEngine): PhysicsSystem {
  const impulse = createPhysicsImpulseHelper(engine)
  const force = createPhysicsForceHelper(engine)

  return {
    applyImpulseToPlayer: impulse.applyImpulseToPlayer,
    applyForceToPlayer: force.applyForceToPlayer,
    removeForceFromPlayer: force.removeForceFromPlayer,
    applyKnockbackToPlayer: impulse.applyKnockbackToPlayer,
    applyForceToPlayerForDuration: force.applyForceToPlayerForDuration
  }
}
