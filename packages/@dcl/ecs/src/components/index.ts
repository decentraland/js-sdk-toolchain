import { PreEngine } from '../engine'
import { ISchema } from '../schemas/ISchema'

import { defineLibraryComponents } from './generated/index.gen'
import * as MeshRendererSchema from './generated/MeshRenderer.gen'
import * as MeshColliderSchema from './generated/MeshCollider.gen'
import {
  ColliderLayer,
  PBMeshCollider
} from './generated/pb/decentraland/sdk/components/mesh_collider.gen'
import { PBMeshRenderer } from './generated/pb/decentraland/sdk/components/mesh_renderer.gen'

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

  // This components are redefined below
  engine.removeComponentDefinition(autogeneratedComponents.MeshRenderer._id)
  engine.removeComponentDefinition(autogeneratedComponents.MeshCollider._id)

  return {
    ...autogeneratedComponents,
    Transform: defineTransformComponent(engine),
    MeshRenderer: engine.defineComponentFromSchema<
      ISchema<PBMeshRenderer>,
      Partial<PBMeshRenderer>
    >(MeshRendererSchema.MeshRendererSchema, MeshRendererSchema.COMPONENT_ID),
    MeshCollider: engine.defineComponentFromSchema<
      ISchema<PBMeshCollider>,
      Partial<PBMeshCollider>
    >(MeshColliderSchema.MeshColliderSchema, MeshColliderSchema.COMPONENT_ID)
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
