// import { PBRaycastResult } from '../components/generated/pb/decentraland/sdk/components/raycast_result.gen'
import * as components from '../components'
import { ColliderLayer, PBRaycastResult, RaycastQueryType } from '../components'
import { Entity, IEngine } from "../engine";
import { Vector3 } from "../components/generated/pb/decentraland/common/vectors.gen";


/**
 * @public
 */
export type RaycastEventSystemCallback = (event: PBRaycastResult) => void

/**
 * @public
 */
export type RaycastEventSystemOptions = {
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
export interface RaycastEventSystem {
  /**
   * @public
   * Remove the callback for raycast event
   * @param entity - Entity where the callback was attached
   */
  removeRaycast(entity: Entity): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update
   * @param entity - Entity to attach the callback
   * @param cb - Function to execute when the entity's RaycastResult component is updated
   * @param opts - Raycast configuration opts
   */
  onRaycast(entity: Entity, cb: RaycastEventSystemCallback, opts?: Partial<RaycastEventSystemOptions>): void
}

/**
 * @internal
 */
export function createRaycastEventSystem(engine: IEngine): RaycastEventSystem {
  const raycastComponent = components.Raycast(engine)

  const getDefaultOpts = (opts: Partial<RaycastEventSystemOptions> = {}): RaycastEventSystemOptions => ({
    maxDistance: 16,
    queryType: RaycastQueryType.RQT_HIT_FIRST,
    timestamp: 0,
    continuous: false,
    collisionMask: ColliderLayer.CL_PHYSICS,
    // TODO: HOW DO I USE VECTOR3.ZERO or VECTOR3.CREATE HERE ???
    // originOffset: Vector3.zero(),
    // direction: {
    //   $case: "localDirection",
    //   localDirection: Vector3.forward
    // },
    ...opts
  })

  function setRaycast(entity: Entity, opts: RaycastEventSystemOptions) {
    const raycast = raycastComponent.getMutableOrNull(entity) || raycastComponent.create(entity)
    raycast.maxDistance = opts.maxDistance
    raycast.timestamp = opts.timestamp
    raycast.originOffset = opts.originOffset
    raycast.collisionMask = opts.collisionMask
    raycast.direction = opts.direction
    raycast.continuous = opts.continuous
    raycast.queryType = opts.queryType
  }

  function removeRaycast(entity: Entity) {
    // TODO: should the component be removed or not ???
    const raycast = raycastComponent.getMutableOrNull(entity)
    if(raycast)
      raycastComponent.deleteFrom(entity)
  }

  // @internal
  // engine.addSystem(function EventSystem() {
  //   for (const [entity, event] of eventsMap) {
  //     if (engine.getEntityState(entity) === EntityState.Removed) {
  //       eventsMap.delete(entity)
  //       continue
  //     }
  //
  //     for (const [eventType, { cb, opts }] of event) {
  //       if (eventType === EventType.Click) {
  //         const command = inputSystem.getClick(opts.button, entity)
  //         if (command)
  //           checkNotThenable(cb(command.up), 'Click event returned a thenable. Only synchronous functions are allowed')
  //       }
  //
  //       if (eventType === EventType.Down || eventType === EventType.Up) {
  //         const command = inputSystem.getInputCommand(opts.button, getPointerEvent(eventType), entity)
  //         if (command) {
  //           checkNotThenable(cb(command), 'Event handler returned a thenable. Only synchronous functions are allowed')
  //         }
  //       }
  //     }
  //   }
  // })

  // TODO: try just returning an object with the corresponding implementations instead of having the
  // implementations in the functions and then being called in the returned object...
  return {
    removeRaycast(entity: Entity) {
    },

    onRaycast(entity: Entity, cb: RaycastEventSystemCallback, opts?: Partial<RaycastEventSystemOptions>) {
    }
  }
}
