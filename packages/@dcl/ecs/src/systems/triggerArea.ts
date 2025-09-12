import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from "../engine";
import { ColliderLayer, PBTriggerAreaResult, TriggerAreaEventType, TriggerAreaMeshType } from "../components";

/**
 * @public
 */
export type TriggerAreaEventSystemCallback = (result: DeepReadonlyObject<PBTriggerAreaResult>) => void

/**
 * @public
 */
/*export type TriggerAreaEventSystemOptions = {
  collisionMask?: number | undefined,
  mesh: TriggerAreaMeshType
}*/

// export const getDefaultOpts = (opts: Partial<TriggerAreaEventSystemOptions> = {}): TriggerAreaEventSystemOptions => ({
//   mesh: TriggerAreaMeshType.TAMT_BOX,
//   collisionMask: ColliderLayer.CL_PLAYER
// })

/**
 * @public
 */
export interface TriggerAreaEventsSystem {
  /**
   * @public
   * Execute callback when an entity enters the Trigger Area
   * @param entity - The entity that already has the TriggerArea component
   * @param cb - Function to execute the 'Enter' type of result is detected
   */
  onTriggerEnter(entity: Entity, cb: TriggerAreaEventSystemCallback): void

  /**
   * @public
   * Remove the callback for Trigger Area 'Enter' type of result
   * @param entity - Entity where the Trigger Area was attached
   */
  removeOnTriggerEnter(entity: Entity): void

  /**
   * @public
   * Execute callback when an entity stays in the Trigger Area
   * @param entity - The entity that already has the TriggerArea component
   * @param cb - Function to execute the 'Stay' type of result is detected
   */
  onTriggerStay(entity: Entity, cb: TriggerAreaEventSystemCallback): void

  /**
   * @public
   * Remove the callback for Trigger Area 'Stay' type of result
   * @param entity - Entity where the Trigger Area was attached
   */
  removeOnTriggerStay(entity: Entity): void

  /**
   * @public
   * Execute callback when an entity exits the Trigger Area
   * @param entity - The entity that already has the TriggerArea component
   * @param cb - Function to execute the 'Exit' type of result is detected
   */
  onTriggerExit(entity: Entity, cb: TriggerAreaEventSystemCallback): void

  /**
   * @public
   * Remove the callback for Trigger Area 'Exit' type of result
   * @param entity - Entity where the Trigger Area was attached
   */
  removeOnTriggerExit(entity: Entity): void
}

/**
 * @internal
 */
export function createTriggerAreaEventsSystem(engine: IEngine) : TriggerAreaEventsSystem {
  const triggerAreaComponent = components.TriggerArea(engine)
  const triggerAreaResultComponent = components.TriggerAreaResult(engine)
  const entitiesMap = new Map<
    Entity,
    {
      triggerCallbackMap: Map<TriggerAreaEventType, TriggerAreaEventSystemCallback>,
      lastConsumedIndex: number
    }
  >()

  function hasCallbacksMap(entity: Entity) : boolean {
    return entitiesMap.has(entity) && entitiesMap.get(entity) !== undefined
  }

  function addEntityCallback(entity: Entity, triggerType: TriggerAreaEventType, callback: TriggerAreaEventSystemCallback) {
    if (hasCallbacksMap(entity)) {
      entitiesMap.get(entity)!.triggerCallbackMap.set(triggerType, callback)
    } else {
      entitiesMap.set(entity,
        {
          triggerCallbackMap: new Map<TriggerAreaEventType, TriggerAreaEventSystemCallback>([[triggerType, callback]]),
          lastConsumedIndex: -1
        })
    }
  }

  function removeEntityCallback(entity: Entity, triggerType: TriggerAreaEventType) {
    if (!entitiesMap.has(entity) || !entitiesMap.get(entity)!.triggerCallbackMap.has(triggerType))
      return
    entitiesMap.get(entity)!.triggerCallbackMap.delete(triggerType)
  }

  // TODO: Where to add the TriggerArea component ???

  function onTriggerEnter(entity: Entity, cb: TriggerAreaEventSystemCallback) {
    addEntityCallback(entity, TriggerAreaEventType.TAET_ENTER, cb)
  }
  function removeOnTriggerEnter(entity: Entity) {
    removeEntityCallback(entity, TriggerAreaEventType.TAET_ENTER)
  }

  // TODO: Can we infer the "STAY" state when ENTER was received but not EXIT ???
  function onTriggerStay(entity: Entity, cb: TriggerAreaEventSystemCallback) {
    addEntityCallback(entity, TriggerAreaEventType.TAET_STAY, cb)
  }
  function removeOnTriggerStay(entity: Entity) {
    removeEntityCallback(entity, TriggerAreaEventType.TAET_STAY)
  }

  function onTriggerExit(entity: Entity, cb: TriggerAreaEventSystemCallback) {
    addEntityCallback(entity, TriggerAreaEventType.TAET_EXIT, cb)
  }
  function removeOnTriggerExit(entity: Entity) {
    removeEntityCallback(entity, TriggerAreaEventType.TAET_EXIT)
  }

  engine.addSystem(function TriggerAreaResultSystem() {
    for (const [entity, data] of entitiesMap) {
      // Can OnChange be used ???

      // triggerAreaResultComponent.getOrNull(enity) // GOVS don't have getOrNull() WTF
      const result = triggerAreaResultComponent.get(entity)
      const values = Array.from(result.values())
      // const lastValue = values [result.size - 1]

      if (data.lastConsumedIndex === result.size-1)
        continue

      for (let i = data.lastConsumedIndex+1; i < values.length; i++) {
        switch (values[i].eventType) {
          case TriggerAreaEventType.TAET_ENTER:
            if (!data.triggerCallbackMap.has(TriggerAreaEventType.TAET_ENTER))
              continue
            data.triggerCallbackMap.get(TriggerAreaEventType.TAET_ENTER)!(values[i])
            break;
          case TriggerAreaEventType.TAET_STAY:
            if (!data.triggerCallbackMap.has(TriggerAreaEventType.TAET_STAY))
              continue
            data.triggerCallbackMap.get(TriggerAreaEventType.TAET_STAY)!(values[i])
            break;
          case TriggerAreaEventType.TAET_EXIT:
            if (!data.triggerCallbackMap.has(TriggerAreaEventType.TAET_EXIT))
              continue
            data.triggerCallbackMap.get(TriggerAreaEventType.TAET_EXIT)!(values[i])
            break;
        }
      }

      data.lastConsumedIndex = result.size - 1
    }

    // engine.getEntitiesWith(triggerAreaResultComponent)
  })

  return {
    onTriggerEnter,
    removeOnTriggerEnter,
    onTriggerStay,
    removeOnTriggerStay,
    onTriggerExit,
    removeOnTriggerExit
  }
}
