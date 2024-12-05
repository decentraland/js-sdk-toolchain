import {
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  PBAudioSource,
  PBGltfContainer,
  PBVideoPlayer,
  Name,
  getComponentEntityTree,
  Transform as TransformEngine
} from '@dcl/ecs'
import { AssetData } from '../../../logic/catalog'
import { CoreComponents, EditorComponentNames } from '../../components'
import { ActionType, ComponentName as AssetPackComponentNames } from '@dcl/asset-packs'
import { Action } from '@dcl/asset-packs'
import { PBMaterial } from '@dcl/ecs'

const BASE_ENTITY_ID = 512
const SINGLE_ENTITY_ID = 0

const assetPackComponents = Object.values(AssetPackComponentNames) as string[]
// Components that must be excluded from the asset
const excludeComponents = [
  // Editor components that are not part of asset-packs
  ...Object.values(EditorComponentNames).filter((name) => !assetPackComponents.includes(name)),
  // Core components that must be excluded from the asset
  CoreComponents.NETWORK_ENTITY,
  // Name component that must be excluded from the asset
  Name.componentName
]

console.log(excludeComponents)
console.log(assetPackComponents)

const componentsWithResources: Record<string, string[]> = {}

// Modified handleResource function to be strongly typed with array paths
function handleResource<T extends object>(type: string, keys: string[]): void {
  componentsWithResources[type] = (keys as string[]).map(String)
}

// Update the handlers to use proper typing with array paths
handleResource<PBGltfContainer>(CoreComponents.GLTF_CONTAINER, ['src'])
handleResource<PBAudioSource>(CoreComponents.AUDIO_SOURCE, ['audioClipUrl'])
handleResource<PBVideoPlayer>(CoreComponents.VIDEO_PLAYER, ['src'])
handleResource<PBMaterial>(CoreComponents.MATERIAL, ['material', 'pbr', 'texture', 'tex', 'texture', 'src'])
handleResource<PBMaterial>(CoreComponents.MATERIAL, ['material', 'pbr', 'alphaTexture', 'tex', 'texture', 'src'])
handleResource<PBMaterial>(CoreComponents.MATERIAL, ['material', 'pbr', 'emissiveTexture', 'tex', 'texture', 'src'])
handleResource<PBMaterial>(CoreComponents.MATERIAL, ['material', 'pbr', 'bumpTexture', 'tex', 'texture', 'src'])

// Add these action types at the top with other constants
const RESOURCE_ACTION_TYPES = [ActionType.SHOW_IMAGE, ActionType.PLAY_CUSTOM_EMOTE, ActionType.PLAY_SOUND] as string[]

export function createCustomAsset(engine: IEngine) {
  return function createCustomAsset(entities: Entity[]): { composite: AssetData['composite']; resources: string[] } {
    const resources: string[] = []
    const composite: AssetData['composite'] = {
      version: 1,
      components: []
    }

    // Create a map to store components by their name
    const componentsByName: Record<string, { data: Record<string, { json: any }> }> = {}

    entities.forEach((entity, index) => {
      // Get the tree of entities with the Transform component
      const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
      const tree = Array.from(getComponentEntityTree(engine, entity, Transform))

      // Process each entity in the tree
      tree.forEach((treeEntity, treeIndex) => {
        // For the root entity, use the original targetEntityId logic
        // For child entities, use incremental IDs starting from BASE_ENTITY_ID + entities.length
        const isRoot = treeEntity === entity
        const targetEntityId =
          entities.length === 1 && isRoot
            ? SINGLE_ENTITY_ID.toString()
            : (BASE_ENTITY_ID + (isRoot ? index : entities.length + treeIndex)).toString()

        // Process each component for the current entity
        for (const component of engine.componentsIter()) {
          const { componentId, componentName } = component

          // Skip editor components that are not part of asset-packs
          if (excludeComponents.includes(componentName)) {
            continue
          }

          // Skip Transform component for root entities
          if (isRoot && componentName === CoreComponents.TRANSFORM) {
            continue
          }

          const Component = engine.getComponent(componentId) as LastWriteWinElementSetComponentDefinition<unknown>

          if (!Component.has(treeEntity)) continue
          const componentValue = Component.get(treeEntity)
          if (!componentValue) continue

          // Process the component value
          const processedComponentValue: any = { ...componentValue }

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
                  debugger
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

          // Initialize component in map if it doesn't exist
          if (!componentsByName[componentName]) {
            componentsByName[componentName] = { data: {} }
          }

          // Add the processed value to the component data
          componentsByName[componentName].data[targetEntityId] = { json: processedComponentValue }
        }
      })
    })

    // Convert the map to the final composite format
    composite.components = Object.entries(componentsByName).map(([name, data]) => ({
      name,
      data: data.data
    }))

    return { composite, resources }
  }
}

export default createCustomAsset
