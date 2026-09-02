import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from '../engine'
import { PBAssetLoadLoadingState } from '../components'
import { EntityState } from '../engine/entity'

/**
 * @public
 */
export type AssetLoadLoadingStateSystemCallback = (event: DeepReadonlyObject<PBAssetLoadLoadingState>) => void

/**
 * @public
 */
export interface AssetLoadLoadingStateSystem {
  removeAssetLoadLoadingStateEntity(entity: Entity): void

  registerAssetLoadLoadingStateEntity(entity: Entity, callback: AssetLoadLoadingStateSystemCallback): void
}

/**
 * @internal
 */
export function createAssetLoadLoadingStateSystem(engine: IEngine): AssetLoadLoadingStateSystem {
  const assetLoadLoadingStateComponent = components.AssetLoadLoadingState(engine)
  const entitiesCallbackAssetLoadLoadingStateMap = new Map<
    Entity,
    {
      callback: AssetLoadLoadingStateSystemCallback
      lastConsumedTimestamp: number
      // How many events carrying `lastConsumedTimestamp` were already delivered. This
      // is a grow-only value set, so several events can share a timestamp; a cursor
      // that only remembered the timestamp dropped every later one of them.
      consumedAtLastTimestamp: number
    }
  >()

  function registerAssetLoadLoadingStateEntity(entity: Entity, callback: AssetLoadLoadingStateSystemCallback) {
    const existing = entitiesCallbackAssetLoadLoadingStateMap.get(entity)
    entitiesCallbackAssetLoadLoadingStateMap.set(entity, {
      callback: callback,
      // -1 rather than 0, so a first event stamped 0 still counts as new.
      lastConsumedTimestamp: existing?.lastConsumedTimestamp ?? -1,
      consumedAtLastTimestamp: existing?.consumedAtLastTimestamp ?? 0
    })
  }

  function removeAssetLoadLoadingStateEntity(entity: Entity) {
    entitiesCallbackAssetLoadLoadingStateMap.delete(entity)
  }

  // @internal
  engine.addSystem(function AssetLoadEventSystem() {
    const garbageEntries = []
    for (const [entity, data] of entitiesCallbackAssetLoadLoadingStateMap) {
      if (engine.getEntityState(entity) === EntityState.Removed) {
        garbageEntries.push(entity)
        continue
      }

      const loadingState = assetLoadLoadingStateComponent.get(entity)

      if (loadingState.size === 0) continue

      // Tracked by timestamp rather than by how many values are stored: the
      // set drops its oldest value once it is full, so its size stops growing
      // and every later event looked like nothing had happened.
      //
      // The timestamp alone is not a cursor though, because this set allows several
      // events to share one. The count of how many were already delivered at the
      // boundary timestamp is carried too, so an event appended at that same timestamp
      // in a later tick is still new. Values arrive in insertion order within a
      // timestamp, so counting is enough to tell the delivered ones from the rest.
      let lastConsumedTimestamp = data.lastConsumedTimestamp
      let consumedAtLastTimestamp = data.consumedAtLastTimestamp
      let seenAtBoundary = 0

      for (const value of loadingState.values()) {
        if (value.timestamp < data.lastConsumedTimestamp) continue

        if (value.timestamp === data.lastConsumedTimestamp) {
          seenAtBoundary++
          if (seenAtBoundary <= data.consumedAtLastTimestamp) continue
        }

        data.callback(value)

        if (value.timestamp > lastConsumedTimestamp) {
          lastConsumedTimestamp = value.timestamp
          consumedAtLastTimestamp = 1
        } else {
          consumedAtLastTimestamp++
        }
      }

      if (
        lastConsumedTimestamp !== data.lastConsumedTimestamp ||
        consumedAtLastTimestamp !== data.consumedAtLastTimestamp
      ) {
        entitiesCallbackAssetLoadLoadingStateMap.set(entity, {
          callback: data.callback,
          lastConsumedTimestamp,
          consumedAtLastTimestamp
        })
      }
    }

    // Clean up garbage entries
    garbageEntries.forEach((garbageEntity) => entitiesCallbackAssetLoadLoadingStateMap.delete(garbageEntity))
  })

  return {
    removeAssetLoadLoadingStateEntity(entity: Entity) {
      removeAssetLoadLoadingStateEntity(entity)
    },
    registerAssetLoadLoadingStateEntity(entity: Entity, callback: AssetLoadLoadingStateSystemCallback) {
      registerAssetLoadLoadingStateEntity(entity, callback)
    }
  }
}
