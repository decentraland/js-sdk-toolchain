import {
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  getComponentEntityTree,
  Transform as TransformEngine,
  TransformType
} from '@dcl/ecs'
import { Action } from '@dcl/asset-packs'
import { AssetData } from '../../logic/catalog'
import { CoreComponents, EditorComponentNames } from '../components'
import { ActionType, ComponentName as AssetPackComponentNames, COMPONENTS_WITH_ID } from '@dcl/asset-packs'

const BASE_ENTITY_ID = 512 as Entity
const SINGLE_ENTITY_ID = 0 as Entity

const assetPackComponents = Object.values(AssetPackComponentNames) as string[]
// Components that must be excluded from the asset
const excludeComponents: string[] = [
  // Editor components that are not part of asset-packs
  ...Object.values(EditorComponentNames).filter((name) => !assetPackComponents.includes(name)),
  // Core components that must be excluded from the asset
  CoreComponents.NETWORK_ENTITY
]

const componentsWithResources: Record<string, string[]> = {}

// Modified handleResource function to be strongly typed with array paths
function handleResource(type: string, keys: string[]): void {
  componentsWithResources[type] = (keys as string[]).map(String)
}

// Update the handlers to use proper typing with array paths
handleResource(CoreComponents.GLTF_CONTAINER, ['src'])
handleResource(CoreComponents.AUDIO_SOURCE, ['audioClipUrl'])
handleResource(CoreComponents.VIDEO_PLAYER, ['src'])
handleResource(CoreComponents.MATERIAL, ['material', 'pbr', 'texture', 'tex', 'texture', 'src'])
handleResource(CoreComponents.MATERIAL, ['material', 'pbr', 'alphaTexture', 'tex', 'texture', 'src'])
handleResource(CoreComponents.MATERIAL, ['material', 'pbr', 'emissiveTexture', 'tex', 'texture', 'src'])
handleResource(CoreComponents.MATERIAL, ['material', 'pbr', 'bumpTexture', 'tex', 'texture', 'src'])

// Add these action types at the top with other constants
const RESOURCE_ACTION_TYPES = [ActionType.SHOW_IMAGE, ActionType.PLAY_CUSTOM_EMOTE, ActionType.PLAY_SOUND] as string[]

function createRef(engine: IEngine, componentId: number, currentEntity: Entity, entityIds: Map<Entity, Entity>) {
  const componentNames = Object.values(AssetPackComponentNames)
  for (const componentName of componentNames) {
    const Component = engine.getComponent(componentName) as LastWriteWinElementSetComponentDefinition<{
      id: number
    }>
    const entities = Array.from(engine.getEntitiesWith(Component))
    const result = entities.find(([_entity, value]) => value.id === componentId)
    if (Array.isArray(result) && result.length > 0) {
      const [ownerEntity] = result
      if (ownerEntity === currentEntity) {
        return `{self:${componentName}}`
      } else {
        const mappedEntityId = entityIds.get(ownerEntity)
        if (typeof mappedEntityId !== 'undefined' && mappedEntityId !== null) {
          return `{${mappedEntityId}:${componentName}}`
        } else {
          throw new Error(
            `Component with id ${componentId} not found in entity ${ownerEntity}.\nentityIds: ${JSON.stringify(
              entityIds,
              null,
              2
            )}`
          )
        }
      }
    }
  }
  throw new Error(`Component with id ${componentId} not found`)
}

function calculateCentroid(
  transformValues: Map<Entity, TransformType>,
  roots: Set<Entity>
): { x: number; y: number; z: number } {
  const positions = Array.from(roots).map((entity) => {
    const transform = transformValues.get(entity)
    return transform?.position || { x: 0, y: 0, z: 0 }
  })

  if (positions.length === 0) return { x: 0, y: 0, z: 0 }

  const sum = positions.reduce(
    (acc, pos) => ({
      x: acc.x + pos.x,
      y: acc.y + pos.y,
      z: acc.z + pos.z
    }),
    { x: 0, y: 0, z: 0 }
  )

  return {
    x: sum.x / positions.length,
    y: sum.y / positions.length,
    z: sum.z / positions.length
  }
}

export function createCustomAsset(engine: IEngine) {
  return function createCustomAsset(entities: Entity[]): { composite: AssetData['composite']; resources: string[] } {
    const resources: string[] = []
    const composite: AssetData['composite'] = {
      version: 1,
      components: []
    }

    // Create a map to store components by their name
    const componentsByName: Record<string, { data: Record<string, { json: any }> }> = {}

    // Phase 1: Create the custom asset entities and map the scene entities to them
    let entityCount = 0
    const entityIds = new Map<Entity, Entity>() // mappings from scene entities to custom asset entities
    const allEntities = new Set<Entity>()
    const roots = new Set<Entity>()

    for (const [index, entity] of entities.entries()) {
      const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
      const tree = Array.from(getComponentEntityTree(engine, entity, Transform))
      for (const sceneEntity of tree) {
        allEntities.add(sceneEntity)
        const isRoot = sceneEntity === entity
        const assetEntity: Entity =
          entities.length === 1 && isRoot
            ? SINGLE_ENTITY_ID
            : ((BASE_ENTITY_ID + (isRoot ? index : entities.length + entityCount++)) as Entity)

        // set the mapping
        entityIds.set(sceneEntity, assetEntity)
        if (isRoot) {
          roots.add(sceneEntity)
        }
      }
    }

    // Store transforms before processing components
    const transformValues = new Map<Entity, TransformType>()
    for (const entity of allEntities) {
      const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
      if (Transform.has(entity)) {
        const transform = Transform.get(entity)
        if (transform) {
          transformValues.set(entity, transform)
        }
      }
    }

    // Calculate centroid for multiple roots
    let centroid = { x: 0, y: 0, z: 0 }
    if (roots.size > 1) {
      centroid = calculateCentroid(transformValues, roots)
    }

    // Phase 2: Process each component for each scene entity and map it to the custom asset entity
    for (const entity of allEntities) {
      const isRoot = roots.has(entity)
      const assetEntity = entityIds.get(entity)!

      // Process each component for the current entity
      for (const component of engine.componentsIter()) {
        const { componentId, componentName } = component

        // Skip editor components that are not part of asset-packs
        if (excludeComponents.includes(componentName)) {
          continue
        }

        // Handle Transform component specially for root entities in multi-root case
        if (componentName === CoreComponents.TRANSFORM) {
          if (isRoot && roots.size === 1) {
            continue // Skip transform for single root as before
          }

          const Component = engine.getComponent(componentId) as LastWriteWinElementSetComponentDefinition<TransformType>
          if (!Component.has(entity)) continue
          const componentValue = Component.get(entity)
          if (!componentValue) continue

          // Process the component value with a deep copy
          const processedComponentValue: TransformType = JSON.parse(JSON.stringify(componentValue))

          // Adjust position relative to centroid for root entities
          if (isRoot && roots.size > 1) {
            processedComponentValue.position = {
              x: processedComponentValue.position.x - centroid.x,
              y: processedComponentValue.position.y - centroid.y,
              z: processedComponentValue.position.z - centroid.z
            }
          }

          // Initialize component in map if it doesn't exist
          if (!componentsByName[componentName]) {
            componentsByName[componentName] = { data: {} }
          }

          // Add the processed value to the component data
          componentsByName[componentName].data[assetEntity] = { json: processedComponentValue }
          continue
        }

        const Component = engine.getComponent(componentId) as LastWriteWinElementSetComponentDefinition<unknown>

        if (!Component.has(entity)) continue
        const componentValue = Component.get(entity)
        if (!componentValue) continue

        // Process the component value with a deep copy
        let processedComponentValue: any = JSON.parse(JSON.stringify(componentValue))

        // Handle special components
        if (componentsWithResources[componentName]) {
          const propertyKeys = componentsWithResources[componentName]
          let value = processedComponentValue

          // Navigate through the property chain safely
          for (let i = 0; i < propertyKeys.length - 1; i++) {
            if (value === undefined || value === null) break
            value = value[propertyKeys[i]]
          }

          // Only process if we have a valid value and final key
          if (value && propertyKeys.length > 0) {
            const finalKey = propertyKeys[propertyKeys.length - 1]
            const originalValue: string = value[finalKey]
            if (originalValue) {
              value[finalKey] = originalValue.replace(/^.*[/]([^/]+)$/, '{assetPath}/$1')
              resources.push(originalValue)
            }
          }
        }

        // Handle Actions component resources
        if (componentName === AssetPackComponentNames.ACTIONS) {
          if (Array.isArray(processedComponentValue.value)) {
            const actions = processedComponentValue.value as Action[]
            processedComponentValue.value = actions.map((action) => {
              if (RESOURCE_ACTION_TYPES.includes(action.type)) {
                const payload = JSON.parse(action.jsonPayload)
                const originalValue: string = payload.src
                payload.src = originalValue.replace(/^.*[/]([^/]+)$/, '{assetPath}/$1')
                resources.push(originalValue)
                action.jsonPayload = JSON.stringify(payload)
              }
              return action
            })
          }
        }

        // Replace id with {self}
        if (COMPONENTS_WITH_ID.includes(componentName)) {
          processedComponentValue.id = '{self}'
        }

        if (componentName === AssetPackComponentNames.TRIGGERS) {
          const newValue = processedComponentValue.value.map((trigger: any) => ({
            ...trigger,
            conditions: (trigger.conditions || []).map((condition: any) => {
              const ref = createRef(engine, condition.id, entity, entityIds)
              return {
                ...condition,
                id: ref
              }
            }),
            actions: trigger.actions.map((action: any) => {
              const ref = createRef(engine, action.id, entity, entityIds)
              return {
                ...action,
                id: ref
              }
            })
          }))
          processedComponentValue = { ...processedComponentValue, value: newValue }
        }

        // Initialize component in map if it doesn't exist
        if (!componentsByName[componentName]) {
          componentsByName[componentName] = { data: {} }
        }

        // Add the processed value to the component data
        componentsByName[componentName].data[assetEntity] = { json: processedComponentValue }
      }
    }

    // Phase 3: Map the entity ids to the target entity ids
    if (componentsByName[CoreComponents.TRANSFORM]) {
      const transform = componentsByName[CoreComponents.TRANSFORM] as {
        data: { [key: Entity]: { json: TransformType } }
      }
      for (const transformData of Object.values(transform.data)) {
        if (transformData.json.parent) {
          const targetEntityId = entityIds.get(transformData.json.parent)
          if (typeof targetEntityId !== 'undefined') {
            transformData.json.parent = targetEntityId
          }
        }
      }
    }

    // Convert the map to the final composite format
    composite.components = Object.entries(componentsByName).map(([name, data]) => ({
      name,
      data: data.data
    }))

    return { composite, resources }
  }
}

export default createCustomAsset
