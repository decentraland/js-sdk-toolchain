import { Entity, IEngine } from "../engine";
import { ColliderLayer, PBTriggerAreaResult, TriggerAreaEventType, TriggerAreaMeshType } from "../components";
import { components } from "../index";

/**
 * @public
 */
export type TriggerAreaEventSystemCallback =  (result: PBTriggerAreaResult) => void

/**
 * @public
 */
export type TriggerAreaEventSystemOptions = {
  collisionMask?: number | undefined,
  mesh: TriggerAreaMeshType
}

export const getDefaultOpts = (opts: Partial<TriggerAreaEventSystemOptions> = {}): TriggerAreaEventSystemOptions => ({
  mesh: TriggerAreaMeshType.TAMT_BOX,
  collisionMask: ColliderLayer.CL_PLAYER
})

export interface TriggerAreaEventsSystem {
  /**
   * @public
   * Execute callback when an entity enters the Trigger Area
   * @param triggerAreaData - Entity to attach the callback, Opts to set collision mask and mesh type
   * @param cb - Function to execute the 'Enter' type of result is detected
   */
  onTriggerEnter(triggerAreaData: { entity: Entity; opts?: Partial<TriggerAreaEventSystemOptions> }, cb: TriggerAreaEventSystemCallback): void

  /**
   * @internal
   * Remove the callback for Trigger Area 'Enter' type of result
   * @param entity - Entity where the Trigger Area was attached
   */
  removeOnTriggerEnter(entity: Entity): void

  /**
   * @public
   * Execute callback when an entity stays in the Trigger Area
   * @param triggerAreaData - Entity to attach the callback, Opts to set collision mask and mesh type
   * @param cb - Function to execute the 'Stay' type of result is detected
   */
  onTriggerStay(triggerAreaData: { entity: Entity; opts?: Partial<TriggerAreaEventSystemOptions> }, cb: TriggerAreaEventSystemCallback): void

  /**
   * @internal
   * Remove the callback for Trigger Area 'Stay' type of result
   * @param entity - Entity where the Trigger Area was attached
   */
  removeOnTriggerStay(entity: Entity): void

  /**
   * @public
   * Execute callback when an entity exits the Trigger Area
   * @param triggerAreaData - Entity to attach the callback, Opts to set collision mask and mesh type
   * @param cb - Function to execute the 'Exit' type of result is detected
   */
  onTriggerExit(triggerAreaData: { entity: Entity; opts?: Partial<TriggerAreaEventSystemOptions> }, cb: TriggerAreaEventSystemCallback): void

  /**
   * @internal
   * Remove the callback for Trigger Area 'Exit' type of result
   * @param entity - Entity where the Trigger Area was attached
   */
  removeOnTriggerExit(entity: Entity): void
}

/**
 * @public
 * ___DO NOT USE___ use triggerAreaEventsSystem instead
 */
export function createTriggerAreaEventsSystem(engine: IEngine) : TriggerAreaEventsSystem {
  const triggerAreaComponent = components.TriggerArea(engine)
  const triggerAreaResultComponent = components.TriggerAreaResult(engine)
  const entitiesCallbackMap = new Map<
    Entity,
    Map<TriggerAreaEventType, TriggerAreaEventSystemCallback>
  >()

  function hasCallbacksMap(entity: Entity) : boolean {
    return entitiesCallbackMap.has(entity) && entitiesCallbackMap.get(entity) !== undefined
  }

  function addEntityCallback(entity: Entity, triggerType: TriggerAreaEventType, callback: TriggerAreaEventSystemCallback) {
    entitiesCallbackMap.set(entity, hasCallbacksMap(entity) ?
      entitiesCallbackMap.get(entity)!.set(triggerType, callback)
      : new Map<TriggerAreaEventType, TriggerAreaEventSystemCallback>([[triggerType, callback]])
    )
  }

  function removeEntityCallback(entity: Entity, triggerType: TriggerAreaEventType) {
    if (!entitiesCallbackMap.has(entity) || !entitiesCallbackMap.get(entity)!.has(triggerType))
      return
    entitiesCallbackMap.get(entity)!.delete(triggerType)
  }

  // TODO: Where to add the TriggerArea component ???

  function onTriggerEnter(data: { entity: Entity; opts?: Partial<TriggerAreaEventSystemOptions> }, cb: TriggerAreaEventSystemCallback) {
    addEntityCallback(data.entity, TriggerAreaEventType.TAET_ENTER, cb)
  }
  function removeOnTriggerEnter(entity: Entity) {
    removeEntityCallback(entity, TriggerAreaEventType.TAET_ENTER)
  }

  // TODO: Can we infer the "STAY" state when ENTER was received but not EXIT ???
  function onTriggerStay(data: { entity: Entity; opts?: Partial<TriggerAreaEventSystemOptions> }, cb: TriggerAreaEventSystemCallback) {
    addEntityCallback(data.entity, TriggerAreaEventType.TAET_STAY, cb)
  }
  function removeOnTriggerStay(entity: Entity) {
    removeEntityCallback(entity, TriggerAreaEventType.TAET_STAY)
  }

  function onTriggerExit(data: { entity: Entity; opts?: Partial<TriggerAreaEventSystemOptions> }, cb: TriggerAreaEventSystemCallback) {
    addEntityCallback(data.entity, TriggerAreaEventType.TAET_EXIT, cb)
  }
  function removeOnTriggerExit(entity: Entity) {
    removeEntityCallback(entity, TriggerAreaEventType.TAET_EXIT)
  }

  return {
    onTriggerEnter,
    removeOnTriggerEnter,
    onTriggerStay,
    removeOnTriggerStay,
    onTriggerExit,
    removeOnTriggerExit
  }
}
