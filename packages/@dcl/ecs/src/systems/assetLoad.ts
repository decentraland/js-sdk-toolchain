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
    }
  >()

  function registerAssetLoadLoadingStateEntity(entity: Entity, callback: AssetLoadLoadingStateSystemCallback) {
    const existing = entitiesCallbackAssetLoadLoadingStateMap.get(entity)
    entitiesCallbackAssetLoadLoadingStateMap.set(entity, {
      callback: callback,
      // -1 rather than 0, so a first event stamped 0 still counts as new.
      lastConsumedTimestamp: existing?.lastConsumedTimestamp ?? -1
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
      let lastConsumedTimestamp = data.lastConsumedTimestamp

      for (const value of loadingState.values()) {
        if (value.timestamp <= data.lastConsumedTimestamp) continue

        data.callback(value)

        if (value.timestamp > lastConsumedTimestamp) {
          lastConsumedTimestamp = value.timestamp
        }
      }

      if (lastConsumedTimestamp !== data.lastConsumedTimestamp) {
        entitiesCallbackAssetLoadLoadingStateMap.set(entity, {
          callback: data.callback,
          lastConsumedTimestamp
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
