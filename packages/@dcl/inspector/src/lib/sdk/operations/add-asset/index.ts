import {
  Entity,
  IEngine,
  Transform as TransformEngine,
  GltfContainer as GltfEngine,
  Vector3Type,
  LastWriteWinElementSetComponentDefinition,
  NetworkEntity as NetworkEntityEngine,
  TransformType,
  Name
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

import { CoreComponents, EditorComponentNames, EditorComponents } from '../../components'
import updateSelectedEntity from '../update-selected-entity'
import { addChild } from '../add-child'
import { isSelf, parseMaterial, parseSyncComponents } from './utils'
import { EnumEntity } from '../../enum-entity'
import { AssetData } from '../../../logic/catalog'
import { pushChild, removeChild } from '../../nodes'

export function addAsset(engine: IEngine) {
  return function addAsset(
    parent: Entity,
    src: string,
    name: string,
    position: Vector3Type,
    base: string,
    enumEntityId: EnumEntity,
    composite?: AssetData['composite'],
    assetId?: string,
    custom?: boolean
  ): Entity {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine
    const NetworkEntity = engine.getComponent(NetworkEntityEngine.componentId) as typeof NetworkEntityEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const CustomAsset = engine.getComponent(EditorComponentNames.CustomAsset) as EditorComponents['CustomAsset']

    if (composite) {
      // Get all unique entity IDs from components
      const entityIds = new Set<Entity>()

      // Track all created entities
      const entities = new Map<Entity, Entity>()

      // Tranform tree
      const parentOf = new Map<Entity, Entity>()
      const transformComponent = composite.components.find((component) => component.name === CoreComponents.TRANSFORM)
      if (transformComponent) {
        for (const [entityId, transformData] of Object.entries(transformComponent.data)) {
          const entity = Number(entityId) as Entity
          entityIds.add(entity)
          if (typeof transformData.json.parent === 'number') {
            parentOf.set(entity, transformData.json.parent)
            entityIds.add(transformData.json.parent)
          }
        }
      }

      // Store names
      const names = new Map<Entity, string>()
      const nameComponent = composite.components.find((component) => component.name === Name.componentName)
      if (nameComponent) {
        for (const [entityId, nameData] of Object.entries(nameComponent.data)) {
          names.set(Number(entityId) as Entity, nameData.json.value)
        }
      }

      // Get all entity ids
      for (const component of composite.components) {
        for (const id of Object.keys(component.data)) {
          entityIds.add(Number(id) as Entity)
        }
      }

      // Get all roots
      const roots = new Set<Entity>()
      for (const entityId of entityIds) {
        if (!parentOf.has(entityId)) {
          roots.add(entityId)
        }
      }

      // Store initial transform values
      const transformValues = new Map<Entity, TransformType>()
      if (transformComponent) {
        for (const [entityId, transformData] of Object.entries(transformComponent.data)) {
          const entity = Number(entityId) as Entity
          transformValues.set(entity, transformData.json)
        }
      }

      if (roots.size === 0) {
        throw new Error('No roots found in composite')
      }
      let defaultParent = parent
      let mainEntity: Entity | null = null

      // If multiple roots, create a new root as main entity
      if (roots.size > 1) {
        mainEntity = addChild(engine)(parent, `${name}_root`)
        Transform.createOrReplace(mainEntity, { parent, position })
        defaultParent = mainEntity
      }

      // If single entity, use it as root and main entity
      if (entityIds.size === 1) {
        mainEntity = addChild(engine)(parent, name)
        Transform.createOrReplace(mainEntity, { parent, position })
        entities.set(entityIds.values().next().value, mainEntity)
      } else {
        // Track orphaned entities that need to be reparented
        const orphanedEntities = new Map<Entity, Entity>()

        // Create all entities
        for (const entityId of entityIds) {
          const isRoot = roots.has(entityId)
          const intendedParentId = parentOf.get(entityId)
          const parentEntity = isRoot
            ? defaultParent
            : typeof intendedParentId === 'number'
            ? entities.get(intendedParentId)
            : undefined

          // If parent doesn't exist yet, temporarily attach to parentForChildren
          if (!isRoot && typeof intendedParentId === 'number' && typeof parentEntity === 'undefined') {
            orphanedEntities.set(entityId, intendedParentId)
          }

          const entity = addChild(engine)(parentEntity || defaultParent, names.get(entityId) || `${name}_${entityId}`)

          // Apply transform values from composite
          const transformValue = transformValues.get(entityId)
          if (transformValue) {
            Transform.createOrReplace(entity, {
              position: transformValue.position || { x: 0, y: 0, z: 0 },
              rotation: transformValue.rotation || { x: 0, y: 0, z: 0, w: 1 },
              scale: transformValue.scale || { x: 1, y: 1, z: 1 },
              parent: parentEntity || defaultParent
            })
          }

          entities.set(entityId, entity)
        }

        // Reparent orphaned entities now that all entities exist
        for (const [entityId, intendedParentId] of orphanedEntities) {
          const entity = entities.get(entityId)!
          const parentEntity = entities.get(intendedParentId)!
          if (parentEntity) {
            const transformValue = transformValues.get(entityId)
            Transform.createOrReplace(entity, {
              parent: parentEntity,
              position: transformValue?.position || { x: 0, y: 0, z: 0 },
              rotation: transformValue?.rotation || { x: 0, y: 0, z: 0, w: 1 },
              scale: transformValue?.scale || { x: 1, y: 1, z: 1 }
            })
            Nodes.createOrReplace(engine.RootEntity, { value: removeChild(engine, defaultParent, entity) })
            Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parentEntity, entity) })
          } else {
            console.warn(`Failed to reparent entity ${entityId}: parent ${intendedParentId} not found`)
          }
        }

        // If multiple entities but single root, use root as main entity
        if (roots.size === 1) {
          const root = Array.from(roots)[0]
          mainEntity = entities.get(root)!
          Transform.createOrReplace(mainEntity, { parent, position })
        }
      }

      const values = new Map<string, any>()

      // Generate ids for components that need them BEFORE processing components
      const ids = new Map<string, number>()
      for (const component of composite.components) {
        const componentName = component.name
        for (const [entityId, data] of Object.entries(component.data)) {
          // Use composite key of componentName and entityId
          const key = `${componentName}:${entityId}`
          const componentValue = { ...data.json }
          if (COMPONENTS_WITH_ID.includes(componentName) && isSelf(componentValue.id)) {
            ids.set(key, getNextId(engine as any))
            componentValue.id = ids.get(key)
          }
          values.set(key, componentValue)
        }
      }

      const mapId = (id: string | number, entityId: string) => {
        if (typeof id === 'string') {
          // Handle self references
          const selfMatch = id.match(/{self:(.+)}/)
          if (selfMatch) {
            const componentName = selfMatch[1]
            const key = `${componentName}:${entityId}`
            return ids.get(key)
          }

          // Handle cross-entity references
          const crossEntityMatch = id.match(/{(\d+):(.+)}/)
          if (crossEntityMatch) {
            const [_, refEntityId, componentName] = crossEntityMatch
            const key = `${componentName}:${refEntityId}`
            return ids.get(key)
          }
        }
        return id
      }

      // Process and create components for each entity
      for (const component of composite.components) {
        const componentName = component.name
        for (const [entityIdStr] of Object.entries(component.data)) {
          const entityId = Number(entityIdStr) as Entity
          const targetEntity = entities.get(entityId)!
          const key = `${componentName}:${entityIdStr}`
          let componentValue = values.get(key)

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
                  id: mapId(condition.id, entityIdStr)
                })),
                actions: trigger.actions.map((action: any) => ({
                  ...action,
                  id: mapId(action.id, entityIdStr)
                }))
              }))
              componentValue = { ...componentValue, value: newValue }
              break
            }
            case CoreComponents.SYNC_COMPONENTS: {
              const componentIds = parseSyncComponents(engine, componentValue.value || componentValue.componentIds)
              componentValue = { componentIds }
              const NetworkEntityComponent = engine.getComponent(NetworkEntity.componentId) as typeof NetworkEntity
              NetworkEntityComponent.create(targetEntity, {
                entityId: enumEntityId.getNextEnumEntityId(),
                networkId: 0
              })
              break
            }
          }

          if (componentName === CoreComponents.TRANSFORM || componentName === Name.componentName) {
            continue
          }

          const Component = engine.getComponent(componentName) as LastWriteWinElementSetComponentDefinition<unknown>
          Component.createOrReplace(targetEntity, componentValue)
        }
      }

      if (!mainEntity) {
        throw new Error('No main entity found')
      }

      if (assetId && custom) {
        CustomAsset.createOrReplace(mainEntity, { assetId })
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
