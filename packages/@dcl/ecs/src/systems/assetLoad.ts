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
      lastLoadingStateLength: number
    }
  >()

  function registerAssetLoadLoadingStateEntity(entity: Entity, callback: AssetLoadLoadingStateSystemCallback) {
    entitiesCallbackAssetLoadLoadingStateMap.set(entity, { callback: callback, lastLoadingStateLength: 0 })
  }

  function removeAssetLoadLoadingStateEntity(entity: Entity) {
    entitiesCallbackAssetLoadLoadingStateMap.delete(entity)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    const garbageEntries = []
    for (const [entity, data] of entitiesCallbackAssetLoadLoadingStateMap) {
      if (engine.getEntityState(entity) === EntityState.Removed) {
        garbageEntries.push(entity)
        continue
      }

      const loadingState = assetLoadLoadingStateComponent.get(entity)

      if (loadingState.size === 0 || loadingState.size === data.lastLoadingStateLength) continue

      // Get last added values (can be multiple per tick, just not for the same asset)
      const lastValues = Array.from(loadingState.values()).slice(data.lastLoadingStateLength)

      lastValues.forEach((value) => {
        data.callback(value)
      })

      entitiesCallbackAssetLoadLoadingStateMap.set(entity, {
        callback: data.callback,
        lastLoadingStateLength: loadingState.size
      })
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
