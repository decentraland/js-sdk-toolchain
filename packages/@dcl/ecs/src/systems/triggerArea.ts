import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from "../engine";
import { PBTriggerAreaResult, TriggerAreaEventType } from "../components";

/**
 * @public
 */
export type TriggerAreaEventSystemCallback = (result: DeepReadonlyObject<PBTriggerAreaResult>) => void

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
  const triggerAreaResultComponent = components.TriggerAreaResult(engine)
  const entitiesMap = new Map<
    Entity,
    {
      triggerCallbackMap: Map<TriggerAreaEventType, TriggerAreaEventSystemCallback>,
      lastConsumedTimestamp: number
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
          lastConsumedTimestamp: -1
        })
    }
  }

  function removeEntityCallback(entity: Entity, triggerType: TriggerAreaEventType) {
    if (!entitiesMap.has(entity) || !entitiesMap.get(entity)!.triggerCallbackMap.has(triggerType))
      return
    entitiesMap.get(entity)!.triggerCallbackMap.delete(triggerType)
  }

  function onTriggerEnter(entity: Entity, cb: TriggerAreaEventSystemCallback) {
    addEntityCallback(entity, TriggerAreaEventType.TAET_ENTER, cb)
  }
  function removeOnTriggerEnter(entity: Entity) {
    removeEntityCallback(entity, TriggerAreaEventType.TAET_ENTER)
  }

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
      const result = triggerAreaResultComponent.get(entity)
      const values = Array.from(result.values())

      if (values.length === 0) continue

      // determine starting index for new values (more than one could be added between System updates)
      // TODO (Optimization): Look for the startIndex with "20-values steps" from latest value backwards
      let startIndex = 0
      if (data.lastConsumedTimestamp >= 0) {
        while (startIndex < values.length && values[startIndex].timestamp <= data.lastConsumedTimestamp) {
          startIndex++
        }
      }

      if (startIndex >= values.length) continue

      for (let i = startIndex; i < values.length; i++) {
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

      data.lastConsumedTimestamp = values[values.length - 1].timestamp
    }
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
