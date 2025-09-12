import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from "../../engine";
import { ColliderLayer, PBTriggerArea, TriggerArea, TriggerAreaMeshType } from "../generated/index.gen";

/**
 * @public
 */
export interface TriggerAreaComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBTriggerArea> {
  /**
   * @public
   * Set a box in the MeshCollider component
   * @param entity - entity to create or replace the TriggerArea component
   * @param collisionMask - the collision layers mask for the trigger to react, default: Player
   */
  setBox(entity: Entity, collisionMask?: ColliderLayer | ColliderLayer[]): void

  /**
   * @public
   * Set a sphere in the MeshCollider component
   * @param entity - entity to create or replace the TriggerArea component
   * @param collisionMask - the collision layers mask for the trigger to react, default: Player
   */
  setSphere(entity: Entity, collisionMask?: ColliderLayer | ColliderLayer[]): void
}

export function defineTriggerAreaComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): TriggerAreaComponentDefinitionExtended {
  const theComponent = TriggerArea(engine)

  function getCollisionMask(layers?: ColliderLayer | ColliderLayer[]) {
    if (Array.isArray(layers)) {
      return layers.map((item) => item as number).reduce((prev, item) => prev | item, 0)
    } else if (layers) {
      return layers
    }
  }

  return {
    ...theComponent,
    setBox(entity: Entity, collisionMask?: ColliderLayer | ColliderLayer[]): void {
      theComponent.createOrReplace(entity, {
        mesh: TriggerAreaMeshType.TAMT_BOX,
        collisionMask: getCollisionMask(collisionMask)
      })
    },
    setSphere(entity: Entity, collisionMask?: ColliderLayer | ColliderLayer[]): void {
      theComponent.createOrReplace(entity, {
        mesh: TriggerAreaMeshType.TAMT_SPHERE,
        collisionMask: getCollisionMask(collisionMask)
      })
    }
  }
}
