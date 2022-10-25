import { PreEngine } from '../engine'

import { defineLibraryComponents } from './generated/index.gen'
import { ColliderLayer } from './generated/pb/decentraland/sdk/components/mesh_collider.gen'

import { defineTransformComponent } from './legacy/Transform'

export enum COMPONENT_ID {
  SYNC = 1000
}

/**
 * @public
 */
export type SdkComponents = ReturnType<typeof defineSdkComponents>

export function defineSdkComponents(engine: PreEngine) {
  const autogeneratedComponents = defineLibraryComponents(engine)

  return {
    ...autogeneratedComponents,
    Transform: defineTransformComponent(engine)
  }
}

/**
 * @public
 * Make the collision mask with some collider layers
 * @param layers a array layers to be assigned
 * @returns collisionMask to be used in the MeshCollider field
 * @example
 * ```ts
 * // Physics and Pointer are the defaults
 * MeshCollider.create(entity, {
 *  collisionMask: makeCollisionMask(
 *    ColliderLayer.Physics,
 *    ColliderLayer.Pointer
 *   ),
 *  box: {}
 * })
 * ```
 */
export function makeCollisionMask(...layers: ColliderLayer[]): number {
  return layers.reduce((item, currentValue) => item | currentValue)
}
