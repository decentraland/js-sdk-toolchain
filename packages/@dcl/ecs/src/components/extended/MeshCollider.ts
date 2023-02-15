import { LastWriteWinElementSetComponentDefinition, Entity, IEngine } from '../../engine'
import { ColliderLayer, MeshCollider, PBMeshCollider } from '../generated/index.gen'

/**
 * @public
 */
export interface MeshColliderComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBMeshCollider> {
  /**
   * @public
   * Set a box in the MeshCollider component
   * @param entity - entity to create or replace the MeshCollider component
   * @param colliderMask - the set of layer where the collider reacts, default: Physics and Pointer
   */
  setBox(entity: Entity, colliderLayers?: ColliderLayer | ColliderLayer[]): void

  /**
   * @public
   * Set a plane in the MeshCollider component
   * @param entity - entity to create or replace the MeshCollider component
   * @param colliderMask - the set of layer where the collider reacts, default: Physics and Pointer
   */
  setPlane(entity: Entity, colliderLayers?: ColliderLayer | ColliderLayer[]): void

  /**
   * @public
   * Set a cylinder in the MeshCollider component
   * @param entity - entity to create or replace the MeshCollider component
   * @param radiusBottom - radius of bottom of cylinder
   * @param radiusTop - radius of top of cylinder
   * @param colliderMask - the set of layer where the collider reacts, default: Physics and Pointer
   */
  setCylinder(
    entity: Entity,
    radiusBottom?: number,
    radiusTop?: number,
    colliderLayers?: ColliderLayer | ColliderLayer[]
  ): void

  /**
   * @public
   * Set a sphere in the MeshCollider component
   * @param entity - entity to create or replace the MeshCollider component
   * @param colliderMask - the set of layer where the collider reacts, default: Physics and Pointer
   */
  setSphere(entity: Entity, colliderLayers?: ColliderLayer | ColliderLayer[]): void
}

export function defineMeshColliderComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): MeshColliderComponentDefinitionExtended {
  const theComponent = MeshCollider(engine)

  function getCollisionMask(layers?: ColliderLayer | ColliderLayer[]) {
    if (Array.isArray(layers)) {
      return layers.map((item) => item as number).reduce((prev, item) => prev | item, 0)
    } else if (layers) {
      return layers
    }
  }

  return {
    ...theComponent,
    setBox(entity: Entity, colliderLayers?: ColliderLayer | ColliderLayer[]): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'box', box: {} },
        collisionMask: getCollisionMask(colliderLayers)
      })
    },
    setPlane(entity: Entity, colliderLayers?: ColliderLayer | ColliderLayer[]): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'plane', plane: {} },
        collisionMask: getCollisionMask(colliderLayers)
      })
    },
    setCylinder(
      entity: Entity,
      radiusBottom?: number,
      radiusTop?: number,
      colliderLayers?: ColliderLayer | ColliderLayer[]
    ): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'cylinder', cylinder: { radiusBottom, radiusTop } },
        collisionMask: getCollisionMask(colliderLayers)
      })
    },
    setSphere(entity: Entity, colliderLayers?: ColliderLayer | ColliderLayer[]): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'sphere', sphere: {} },
        collisionMask: getCollisionMask(colliderLayers)
      })
    }
  }
}
