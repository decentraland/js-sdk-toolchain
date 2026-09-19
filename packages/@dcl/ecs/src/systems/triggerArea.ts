import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from '../engine'
import { EntityState } from '../engine/entity'
import { PBTriggerAreaResult, TriggerAreaEventType } from '../components'

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
   *
   * Note: stay callbacks are synthesized by the SDK on every tick between a wire ENTER and a wire EXIT.
   * Wire-level TAET_STAY events (still emitted by legacy Explorers) are ignored entirely — they neither
   * fire callbacks nor mutate state. The SDK is the sole source of onTriggerStay dispatches, driven
   * from the ENTER/EXIT state machine.
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

type TriggerAreaEntityState = {
  triggerCallbackMap: Map<TriggerAreaEventType, TriggerAreaEventSystemCallback>
  lastConsumedTimestamp: number
  /**
   * Tracks triggerers currently inside this trigger area, driven by ENTER/EXIT wire events only.
   * Keyed by triggerer entity (the entity that walked in, e.g. the player avatar entity).
   * Value caches the most recent PBTriggerAreaResult for that triggerer; updated on ENTER only.
   * Used to build synthesized per-tick OnStay callbacks.
   */
  insideTriggerers: Map<Entity, PBTriggerAreaResult>
}

/**
 * Builds a synthetic PBTriggerAreaResult for a per-tick onStay callback.
 *
 * Transform components are resolved at call time so that scene-owned entities report
 * up-to-date position/rotation/scale. For player-avatar triggerers (reserved entities
 * without a scene-side Transform), there is no scene Transform component, so the cached
 * values from the last ENTER or wire-STAY event are used as-is. These cached values may
 * be slightly stale for the current frame — this is expected and acceptable for the
 * avatar case.
 */
function buildSyntheticStayResult(
  cached: DeepReadonlyObject<PBTriggerAreaResult>,
  triggerAreaEntity: Entity,
  triggererEntity: Entity,
  currentTimestamp: number,
  Transform: ReturnType<typeof components.Transform>
): PBTriggerAreaResult {
  // Shallow-clone the trigger sub-object so we can mutate it.
  const trigger: PBTriggerAreaResult['trigger'] = cached.trigger
    ? {
        entity: cached.trigger.entity,
        layers: cached.trigger.layers,
        position: cached.trigger.position ? { ...cached.trigger.position } : undefined,
        rotation: cached.trigger.rotation ? { ...cached.trigger.rotation } : undefined,
        scale: cached.trigger.scale ? { ...cached.trigger.scale } : undefined
      }
    : undefined

  // Build the cloned result with a forced TAET_STAY eventType and refreshed timestamp.
  const result: PBTriggerAreaResult = {
    triggeredEntity: cached.triggeredEntity,
    triggeredEntityPosition: cached.triggeredEntityPosition ? { ...cached.triggeredEntityPosition } : undefined,
    triggeredEntityRotation: cached.triggeredEntityRotation ? { ...cached.triggeredEntityRotation } : undefined,
    eventType: TriggerAreaEventType.TAET_STAY,
    timestamp: currentTimestamp,
    trigger
  }

  // Refresh trigger-area entity transform when it is scene-owned.
  const triggerAreaTransform = Transform.getOrNull(triggerAreaEntity)
  if (triggerAreaTransform !== null) {
    result.triggeredEntityPosition = { ...triggerAreaTransform.position }
    result.triggeredEntityRotation = { ...triggerAreaTransform.rotation }
  }

  // Refresh triggerer transform when it is scene-owned.
  // For player-avatar entities (reserved, no scene-side Transform) the cached values are kept.
  const triggererTransform = Transform.getOrNull(triggererEntity)
  if (triggererTransform !== null && result.trigger) {
    result.trigger.position = { ...triggererTransform.position }
    result.trigger.rotation = { ...triggererTransform.rotation }
    result.trigger.scale = { ...triggererTransform.scale }
  }

  return result
}

/**
 * @internal
 */
export function createTriggerAreaEventsSystem(engine: IEngine): TriggerAreaEventsSystem {
  const triggerAreaResultComponent = components.TriggerAreaResult(engine)
  const Transform = components.Transform(engine)
  const entitiesMap = new Map<Entity, TriggerAreaEntityState>()

  function hasCallbacksMap(entity: Entity): boolean {
    return entitiesMap.has(entity) && entitiesMap.get(entity) !== undefined
  }

  function addEntityCallback(
    entity: Entity,
    triggerType: TriggerAreaEventType,
    callback: TriggerAreaEventSystemCallback
  ) {
    if (hasCallbacksMap(entity)) {
      entitiesMap.get(entity)!.triggerCallbackMap.set(triggerType, callback)
    } else {
      entitiesMap.set(entity, {
        triggerCallbackMap: new Map<TriggerAreaEventType, TriggerAreaEventSystemCallback>([[triggerType, callback]]),
        lastConsumedTimestamp: -1,
        insideTriggerers: new Map<Entity, PBTriggerAreaResult>()
      })
    }
  }

  function removeEntityCallback(entity: Entity, triggerType: TriggerAreaEventType) {
    if (!entitiesMap.has(entity) || !entitiesMap.get(entity)!.triggerCallbackMap.has(triggerType)) return
    const triggerCallbackMap = entitiesMap.get(entity)!.triggerCallbackMap
    triggerCallbackMap.delete(triggerType)

    // Remove entity if no more trigger callbacks are registered.
    // insideTriggerers is intentionally left populated so that re-subscription picks up
    // in-flight sessions without missing the first synthesized onStay.
    if (triggerCallbackMap.size === 0) entitiesMap.delete(entity)
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
    const garbageEntries = []
    for (const [entity, data] of entitiesMap) {
      if (engine.getEntityState(entity) === EntityState.Removed) {
        garbageEntries.push(entity)
        continue
      }

      const result = triggerAreaResultComponent.get(entity)

      // -----------------------------------------------------------------------
      // Pass 1: drain new GOVS events
      // -----------------------------------------------------------------------

      // The Explorer may be taking time before the result component is put.
      if (result.size > 0) {
        const values = Array.from(result.values())

        // Determine starting index for new values (more than one could be added between System updates).
        // Search backwards to find the anchor at lastConsumedTimestamp.
        let startIndex = 0
        if (data.lastConsumedTimestamp >= 0) {
          const newestTimestamp = values[values.length - 1].timestamp

          // If nothing new, skip processing.
          if (newestTimestamp > data.lastConsumedTimestamp) {
            // Find index of value with the lastConsumedTimestamp.
            let i = values.length - 2
            while (i >= 0 && values[i].timestamp > data.lastConsumedTimestamp) i--

            // Mark the following value index as the starting point to trigger all the new value callbacks.
            startIndex = i + 1
          } else {
            // No new events — skip to Pass 2.
            startIndex = values.length
          }
        }

        if (startIndex < values.length) {
          // Process new wire events in chronological order.
          for (let i = startIndex; i < values.length; i++) {
            const event = values[i]
            switch (event.eventType) {
              case TriggerAreaEventType.TAET_ENTER:
                // Update in-flight tracking before firing the callback.
                data.insideTriggerers.set(event.trigger!.entity as Entity, {
                  triggeredEntity: event.triggeredEntity,
                  triggeredEntityPosition: event.triggeredEntityPosition
                    ? { ...event.triggeredEntityPosition }
                    : undefined,
                  triggeredEntityRotation: event.triggeredEntityRotation
                    ? { ...event.triggeredEntityRotation }
                    : undefined,
                  eventType: event.eventType,
                  timestamp: event.timestamp,
                  trigger: event.trigger
                    ? {
                        entity: event.trigger.entity,
                        layers: event.trigger.layers,
                        position: event.trigger.position ? { ...event.trigger.position } : undefined,
                        rotation: event.trigger.rotation ? { ...event.trigger.rotation } : undefined,
                        scale: event.trigger.scale ? { ...event.trigger.scale } : undefined
                      }
                    : undefined
                })
                if (data.triggerCallbackMap.has(TriggerAreaEventType.TAET_ENTER)) {
                  data.triggerCallbackMap.get(TriggerAreaEventType.TAET_ENTER)!(event)
                }
                break
              case TriggerAreaEventType.TAET_EXIT:
                data.insideTriggerers.delete(event.trigger!.entity as Entity)
                if (data.triggerCallbackMap.has(TriggerAreaEventType.TAET_EXIT)) {
                  data.triggerCallbackMap.get(TriggerAreaEventType.TAET_EXIT)!(event)
                }
                break
              // Wire-level TAET_STAY and any unknown event types are ignored — no callback, no state mutation.
            }
          }

          data.lastConsumedTimestamp = values[values.length - 1].timestamp
        }
      }

      // -----------------------------------------------------------------------
      // Pass 2: synthesize per-tick onStay callbacks
      // -----------------------------------------------------------------------
      // Only run if an onStay callback is registered and there are tracked triggerers.
      if (data.triggerCallbackMap.has(TriggerAreaEventType.TAET_STAY) && data.insideTriggerers.size > 0) {
        const onStay = data.triggerCallbackMap.get(TriggerAreaEventType.TAET_STAY)!
        const currentTimestamp = Date.now()
        for (const [triggererEntity, cachedResult] of data.insideTriggerers) {
          onStay(buildSyntheticStayResult(cachedResult, entity, triggererEntity, currentTimestamp, Transform))
        }
      }
    }

    // Clean up garbage entries.
    garbageEntries.forEach((garbageEntity) => entitiesMap.delete(garbageEntity))
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
