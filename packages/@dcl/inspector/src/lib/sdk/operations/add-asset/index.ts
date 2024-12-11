import {
  Entity,
  IEngine,
  Transform as TransformEngine,
  GltfContainer as GltfEngine,
  Vector3Type,
  LastWriteWinElementSetComponentDefinition,
  NetworkEntity as NetworkEntityEngine,
  TransformType
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
    assetId?: string
  ): Entity {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine
    const NetworkEntity = engine.getComponent(NetworkEntityEngine.componentId) as typeof NetworkEntityEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']

    if (composite) {
      // Get all unique entity IDs from components
      const entityIds = new Set<Entity>()

      // Track all created entities
      const entities = new Map<Entity, Entity>()

      // Tranform tree
      const parentOf = new Map<Entity, Entity>()
      const transform = composite.components.find((component) => component.name === CoreComponents.TRANSFORM)
      if (transform) {
        for (const [entityId, transformData] of Object.entries(transform.data)) {
          const entity = Number(entityId) as Entity
          entityIds.add(entity)
          if (typeof transformData.json.parent === 'number') {
            parentOf.set(entity, transformData.json.parent)
            entityIds.add(transformData.json.parent)
          }
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

      console.log('roots', roots)
      debugger

      // Store initial transform values
      const transformValues = new Map<Entity, TransformType>()
      if (transform) {
        for (const [entityId, transformData] of Object.entries(transform.data)) {
          const entity = Number(entityId) as Entity
          transformValues.set(entity, transformData.json)
        }
      }

      if (roots.size === 0) {
        throw new Error('No roots found in composite')
      }
      let defaultParent = parent
      let mainEntity: Entity | null = null
      if (roots.size > 1) {
        mainEntity = addChild(engine)(parent, `${name}_root`)
        Transform.createOrReplace(mainEntity, { parent, position })
        defaultParent = mainEntity
      } else if (entityIds.size === 1) {
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

          const entity = addChild(engine)(parentEntity || defaultParent, `${name}_${entityId}`)

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

        // Set mainEntity to the first (and only) root
        const root = Array.from(roots)[0]
        mainEntity = entities.get(root)!
        Transform.createOrReplace(mainEntity, { parent, position })
      }

      for (const entityId of entityIds) {
        const entity = entities.get(entityId)!
        const transform = Transform.get(entity)
        console.log('transform', entityId, entity, transform)
      }

      const values = new Map<string, any>()

      // Generate ids for components that need them BEFORE processing components
      const ids = new Map<string, number>()
      for (const component of composite.components) {
        const componentName = component.name
        for (const [entityId, data] of Object.entries(component.data)) {
          const componentValue = { ...data.json }
          if (COMPONENTS_WITH_ID.includes(componentName) && isSelf(componentValue.id)) {
            ids.set(componentName, getNextId(engine as any))
            componentValue.id = ids.get(componentName)
          }
          // Use composite key of componentName and entityId
          const key = `${componentName}:${entityId}`
          values.set(key, componentValue)
        }
      }

      const mapId = (id: string | number) => {
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
                  id: mapId(condition.id)
                })),
                actions: trigger.actions.map((action: any) => ({
                  ...action,
                  id: mapId(action.id)
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

          if (componentName === CoreComponents.TRANSFORM) {
            continue
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
