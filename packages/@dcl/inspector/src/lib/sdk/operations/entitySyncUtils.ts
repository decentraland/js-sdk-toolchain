import { Entity } from '@dcl/ecs'
import { SdkContextValue } from '../context'
import { ActionType } from '@dcl/asset-packs'

type EntitySyncResult = {
  hasSyncComponents: boolean
  hasNetworkEntity: boolean
  syncComponentIds: number[]
}

/**
 * Adds SyncComponents to multiple entities.
 *
 * @param sdk - The SDK instance
 * @param entities - Array of entities to add SyncComponents to
 * @param componentIds - Optional array of component IDs to synchronize
 * @returns A record of results per entity
 */
export function addSyncComponentsToEntities(
  sdk: SdkContextValue,
  entities: Entity[],
  componentIds: number[] = []
): Record<Entity, boolean> {
  if (!entities.length) return {}

  const { engine, enumEntity, operations } = sdk
  const { Actions, NetworkEntity, SyncComponents } = sdk.components

  const results: Record<Entity, boolean> = {}
  let needsDispatch = false

  // Precompute entity component presence map
  const getEntityComponentIds = (entity: Entity): Set<number> => {
    const ids = new Set<number>()

    for (const component of engine.componentsIter()) {
      if (component.has(entity)) {
        ids.add(component.componentId)
      }
    }

    if (Actions.has(entity)) {
      const actions = Actions.get(entity)
      for (const action of actions.value) {
        switch (action.type) {
          case ActionType.PLAY_ANIMATION:
          case ActionType.STOP_ANIMATION:
            ids.add(sdk.components.Animator.componentId)
            break
          case ActionType.START_TWEEN:
            ids.add(sdk.components.Tween.componentId)
            break
          case ActionType.PLAY_SOUND:
          case ActionType.STOP_SOUND:
            ids.add(sdk.components.AudioSource.componentId)
            break
          case ActionType.PLAY_AUDIO_STREAM:
          case ActionType.STOP_AUDIO_STREAM:
            ids.add(sdk.components.AudioSource.componentId)
            break
          case ActionType.PLAY_VIDEO_STREAM:
          case ActionType.STOP_VIDEO_STREAM:
            ids.add(sdk.components.VideoPlayer.componentId)
            break
          case ActionType.SET_POSITION:
          case ActionType.SET_ROTATION:
          case ActionType.SET_SCALE:
          case ActionType.PLACE_ON_PLAYER:
          case ActionType.PLACE_ON_CAMERA:
          case ActionType.ROTATE_AS_PLAYER:
          case ActionType.ROTATE_AS_CAMERA:
          case ActionType.FOLLOW_PLAYER:
            ids.add(sdk.components.Transform.componentId)
            break
        }
      }
    }

    return ids
  }

  const transformId = sdk.components.Transform.componentId
  const tweenId = sdk.components.Tween.componentId

  for (const entity of entities) {
    if (entity === 0) {
      results[entity] = false
      continue
    }

    const entityComponentIds = getEntityComponentIds(entity)
    let validComponentIds = componentIds.filter((id) => entityComponentIds.has(id))

    if (validComponentIds.length === 0) {
      results[entity] = false
      continue
    }

    const hasSyncComponents = SyncComponents.has(entity)

    if (!hasSyncComponents) {
      // For new sync components, ensure we don't add both Transform and Tween (priotizing Tweens)
      if (validComponentIds.includes(transformId) && validComponentIds.includes(tweenId)) {
        validComponentIds = validComponentIds.filter((id) => id !== transformId)
      }

      operations.addComponent(entity, SyncComponents.componentId)
      operations.updateValue(SyncComponents, entity, { componentIds: validComponentIds })
      results[entity] = true
      needsDispatch = true
    } else {
      const currentValue = SyncComponents.get(entity)
      const currentIds = new Set(currentValue.componentIds || [])

      // If Tween exists in Sync, don't add Transform
      if (currentIds.has(tweenId) && validComponentIds.includes(transformId)) {
        validComponentIds = validComponentIds.filter((id) => id !== transformId)
      }

      // If Transform exists in Sync, don't add Tween
      if (currentIds.has(transformId) && validComponentIds.includes(tweenId)) {
        validComponentIds = validComponentIds.filter((id) => id !== tweenId)
      }

      const updatedIds = Array.from(currentIds)
      let changed = false
      for (const id of validComponentIds) {
        if (!currentIds.has(id)) {
          updatedIds.push(id)
          changed = true
        }
      }

      if (changed) {
        operations.updateValue(SyncComponents, entity, { componentIds: updatedIds })
        results[entity] = true
        needsDispatch = true
      } else {
        results[entity] = false
      }
    }

    const hasNetworkEntity = NetworkEntity.has(entity)

    if (!hasNetworkEntity) {
      operations.addComponent(entity, NetworkEntity.componentId)
      operations.updateValue(NetworkEntity, entity, {
        entityId: enumEntity.getNextEnumEntityId(),
        networkId: 0
      })
      needsDispatch = true
    }
  }

  if (needsDispatch) {
    void operations.dispatch()
  }

  return results
}

/**
 * Removes SyncComponents and NetworkEntity from multiple entities
 *
 * @param sdk - The SDK instance
 * @param entities - Array of entities to remove components from
 * @returns A record of results per entity
 */
export async function removeSyncComponentsFromEntities(
  sdk: SdkContextValue,
  entities: Entity[]
): Promise<Record<Entity, boolean>> {
  if (!entities.length) return {}

  const { NetworkEntity, SyncComponents } = sdk.components
  const results: Record<Entity, boolean> = {}
  let needsDispatch = false

  entities.forEach((entity) => {
    const hasSyncComponents = SyncComponents.has(entity)
    const hasNetworkEntity = NetworkEntity.has(entity)

    if (hasSyncComponents) {
      sdk.operations.removeComponent(entity, SyncComponents)
      needsDispatch = true
    }

    if (hasNetworkEntity) {
      sdk.operations.removeComponent(entity, NetworkEntity)
      needsDispatch = true
    }

    results[entity] = hasSyncComponents || hasNetworkEntity
  })

  if (needsDispatch) {
    await sdk.operations.dispatch()
  }

  return results
}

/**
 * Gets the current sync status for multiple entities
 *
 * @param sdk - The SDK instance
 * @param entities - Array of entities to check
 * @returns A record of sync status per entity
 */
export function getEntitiesSyncStatus(sdk: SdkContextValue, entities: Entity[]): Record<Entity, EntitySyncResult> {
  const results: Record<Entity, EntitySyncResult> = {}

  entities.forEach((entity) => {
    const hasSyncComponents = sdk.components.SyncComponents.has(entity)
    const hasNetworkEntity = sdk.components.NetworkEntity.has(entity)
    const syncComponentsValue = hasSyncComponents ? sdk.components.SyncComponents.get(entity) : null

    results[entity] = {
      hasSyncComponents,
      hasNetworkEntity,
      syncComponentIds: syncComponentsValue?.componentIds || []
    }
  })

  return results
}
