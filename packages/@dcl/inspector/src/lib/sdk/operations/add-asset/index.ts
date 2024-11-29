import {
  Entity,
  IEngine,
  Transform as TransformEngine,
  GltfContainer as GltfEngine,
  Vector3Type,
  LastWriteWinElementSetComponentDefinition,
  NetworkEntity as NetworkEntityEngine
} from '@dcl/ecs'
import {
  ActionType,
  Actions,
  COMPONENTS_WITH_ID,
  ComponentName,
  getJson,
  getNextId,
  getPayload
} from '@dcl/asset-packs'

import { CoreComponents, EditorComponentNames } from '../../components'
import updateSelectedEntity from '../update-selected-entity'
import { addChild } from '../add-child'
import { isSelf, parseMaterial, parseSyncComponents } from './utils'
import { EnumEntity } from '../../enum-entity'
import { AssetData } from '../../../logic/catalog'

export function addAsset(engine: IEngine) {
  return function addAsset(
    parent: Entity,
    src: string,
    name: string,
    position: Vector3Type,
    base: string,
    enumEntityId: EnumEntity,
    composite?: AssetData['composite'],
    assetId?: string
  ): Entity {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine
    const NetworkEntity = engine.getComponent(NetworkEntityEngine.componentId) as typeof NetworkEntityEngine

    if (composite) {
      // Get all unique entity IDs from components
      const entityIds = new Set<string>()
      for (const component of composite.components) {
        Object.keys(component.data).forEach((id) => entityIds.add(id))
      }

      // Track all created entities
      const entities = new Map<string, Entity>()

      // If there's only one entity, it becomes the main entity
      // If there are multiple entities, create a new main entity as parent
      const mainEntity =
        entityIds.size === 1 ? addChild(engine)(parent, name) : addChild(engine)(parent, `${name}_root`)

      Transform.createOrReplace(mainEntity, { parent, position })

      // Set up entity hierarchy based on number of entities
      const parentForChildren = entityIds.size === 1 ? parent : mainEntity

      // Create all entities
      for (const entityId of entityIds) {
        if (entityIds.size === 1) {
          // Single entity case: use the main entity
          entities.set(entityId, mainEntity)
        } else {
          // Multiple entities case: create child entities
          const entity = entityId === '0' ? mainEntity : addChild(engine)(parentForChildren, `${name}_${entityId}`)

          if (entityId !== '0') {
            Transform.createOrReplace(entity, {
              parent: parentForChildren,
              position: { x: 0, y: 0, z: 0 }
            })
          }
          entities.set(entityId, entity)
        }
      }

      const values = new Map<string, any>()

      // Generate ids for components that need them BEFORE processing components
      const ids = new Map<string, number>()
      for (const component of composite.components) {
        const componentName = component.name
        for (const [_entityId, data] of Object.entries(component.data)) {
          const componentValue = { ...data.json }
          if (COMPONENTS_WITH_ID.includes(componentName) && isSelf(componentValue.id)) {
            ids.set(componentName, getNextId(engine as any))
            componentValue.id = ids.get(componentName)
          }
          values.set(componentName, componentValue)
        }
      }

      const mapId = (id: string | number) => {
        debugger
        if (typeof id === 'string') {
          const match = id.match(/{self:(.+)}/)
          if (match) {
            const componentName = match[1]
            return ids.get(componentName)
          }
        }
        return id
      }

      // Process and create components for each entity
      for (const component of composite.components) {
        const componentName = component.name
        for (const [entityId] of Object.entries(component.data)) {
          const targetEntity = entities.get(entityId)!
          let componentValue = values.get(componentName)

          switch (componentName) {
            case CoreComponents.GLTF_CONTAINER: {
              componentValue.visibleMeshesCollisionMask ??= 1
              componentValue.invisibleMeshesCollisionMask ??= 2
              componentValue.src = componentValue.src.replace('{assetPath}', base)
              break
            }
            case EditorComponentNames.Config: {
              if (assetId) {
                componentValue = { ...componentValue, assetId }
              }
              break
            }
            case CoreComponents.AUDIO_SOURCE: {
              componentValue.src = componentValue.audioClipUrl.replace('{assetPath}', base)
              break
            }
            case CoreComponents.VIDEO_PLAYER: {
              componentValue.src = componentValue.src.replace('{assetPath}', base)
              break
            }
            case CoreComponents.MATERIAL: {
              componentValue = parseMaterial(base, componentValue)
              break
            }
            case ComponentName.ACTIONS: {
              const newValue: Actions['value'] = []
              for (const action of componentValue.value) {
                switch (action.type) {
                  case ActionType.PLAY_SOUND: {
                    const payload = getPayload<ActionType.PLAY_SOUND>(action)
                    newValue.push({
                      ...action,
                      jsonPayload: getJson<ActionType.PLAY_SOUND>({
                        ...payload,
                        src: payload.src.replace('{assetPath}', base)
                      })
                    })
                    break
                  }
                  case ActionType.PLAY_CUSTOM_EMOTE: {
                    const payload = getPayload<ActionType.PLAY_CUSTOM_EMOTE>(action)
                    newValue.push({
                      ...action,
                      jsonPayload: getJson<ActionType.PLAY_CUSTOM_EMOTE>({
                        ...payload,
                        src: payload.src.replace('{assetPath}', base)
                      })
                    })
                    break
                  }
                  default:
                    newValue.push(action)
                    break
                }
              }
              componentValue = { ...componentValue, value: newValue }
              break
            }
            case ComponentName.TRIGGERS: {
              const newValue = componentValue.value.map((trigger: any) => ({
                ...trigger,
                conditions: (trigger.conditions || []).map((condition: any) => ({
                  ...condition,
                  id: mapId(condition.id)
                })),
                actions: trigger.actions.map((action: any) => ({
                  ...action,
                  id: mapId(action.id)
                }))
              }))
              componentValue = { ...componentValue, value: newValue }
              debugger
              break
            }
            case CoreComponents.SYNC_COMPONENTS: {
              const componentIds = parseSyncComponents(engine, componentValue.value)
              componentValue = { componentIds }
              const NetworkEntityComponent = engine.getComponent(NetworkEntity.componentId) as typeof NetworkEntity
              NetworkEntityComponent.create(targetEntity, {
                entityId: enumEntityId.getNextEnumEntityId(),
                networkId: 0
              })
              break
            }
          }

          const Component = engine.getComponent(componentName) as LastWriteWinElementSetComponentDefinition<unknown>
          Component.create(targetEntity, componentValue)
        }
      }

      // update selection
      updateSelectedEntity(engine)(mainEntity)
      return mainEntity
    } else {
      // Handle non-composite case
      const mainEntity = addChild(engine)(parent, name)
      Transform.createOrReplace(mainEntity, { parent, position })

      GltfContainer.create(mainEntity, {
        src: `${base}/${src}`,
        visibleMeshesCollisionMask: 1,
        invisibleMeshesCollisionMask: 2
      })

      // update selection
      updateSelectedEntity(engine)(mainEntity)
      return mainEntity
    }
  }
}

export default addAsset
