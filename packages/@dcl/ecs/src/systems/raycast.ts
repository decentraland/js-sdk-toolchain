import * as components from '../components'
import { ColliderLayer, RaycastQueryType, PBRaycastResult } from '../components'
import { DeepReadonlyObject, Entity, IEngine } from "../engine";
import { Vector3 } from "../components/generated/pb/decentraland/common/vectors.gen";
import { EntityState } from "../engine/entity";

/**
 * @public
 */
export type RaycastEventsSystemCallback = (event: DeepReadonlyObject<PBRaycastResult>) => void

/**
 * @public
 */
export type RaycastEventsSystemOptions = {
  timestamp?:
    | number
    | undefined;
  originOffset?: Vector3 | undefined;
  direction?:
    | { $case: "localDirection"; localDirection: Vector3 }
    | { $case: "globalDirection"; globalDirection: Vector3 }
    | { $case: "globalTarget"; globalTarget: Vector3 }
    | { $case: "targetEntity"; targetEntity: number };
  maxDistance: number;
  queryType: RaycastQueryType;
  continuous?:
    | boolean
    | undefined;
  collisionMask?: number | undefined;
}

/**
 * @public
 */
export interface RaycastEventsSystem {
  /**
   * @public
   * Remove the callback for raycast event
   * @param entity - Entity where the callback was attached
   */
  removeRaycasterEntity(entity: Entity): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerRaycasterEntity(entity: Entity, callback: RaycastEventsSystemCallback, options?: Partial<RaycastEventsSystemOptions>): void
}

/**
 * @internal
 */
export function createRaycastEventsSystem(engine: IEngine): RaycastEventsSystem {
  const raycastComponent = components.Raycast(engine)
  const raycastResultComponent = components.RaycastResult(engine)
  const entitiesCallbackResultMap = new Map<Entity, { callback: RaycastEventsSystemCallback }>()

  const getDefaultOptions = (options: Partial<RaycastEventsSystemOptions> = {}): RaycastEventsSystemOptions => ({
    maxDistance: 16,
    queryType: RaycastQueryType.RQT_HIT_FIRST,
    timestamp: 0,
    continuous: false,
    collisionMask: ColliderLayer.CL_PHYSICS,
    originOffset: { x: 0, y:0, z:0 },
    direction: {
      $case: "localDirection",
      localDirection: { x: 0, y:0, z:1 }
    },
    ...options
  })

  function registerRaycast(entity: Entity, callback: RaycastEventsSystemCallback, options: RaycastEventsSystemOptions) {
    const raycast = raycastComponent.getOrCreateMutable(entity)
    raycast.maxDistance = options.maxDistance
    raycast.timestamp = options.timestamp
    raycast.originOffset = options.originOffset
    raycast.collisionMask = options.collisionMask
    raycast.direction = options.direction
    raycast.continuous = options.continuous
    raycast.queryType = options.queryType

    entitiesCallbackResultMap.set(entity, { callback: callback })
  }

  function removeRaycast(entity: Entity) {
    raycastComponent.deleteFrom(entity)
    raycastResultComponent.deleteFrom(entity)
    entitiesCallbackResultMap.delete(entity)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    for (const [entity, data] of entitiesCallbackResultMap) {
      const raycast = raycastComponent.getOrNull(entity)
      if (engine.getEntityState(entity) === EntityState.Removed || !raycast) {
        entitiesCallbackResultMap.delete(entity)
        continue
      }

      const currentResult = raycastResultComponent.getOrNull(entity)
      if (!currentResult) continue

      data.callback(currentResult)

      if (!raycast.continuous)
        removeRaycast(entity)
    }
  })

  return {
    removeRaycasterEntity(entity: Entity) {
      removeRaycast(entity)
    },

    registerRaycasterEntity(entity: Entity, callback: RaycastEventsSystemCallback, opts?: Partial<RaycastEventsSystemOptions>) {
      const options = getDefaultOptions(opts)
      registerRaycast(entity, callback, options)
    }
  }
}
