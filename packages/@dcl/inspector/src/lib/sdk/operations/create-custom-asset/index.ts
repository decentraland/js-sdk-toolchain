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
import { ComponentName as AssetPackComponentNames } from '@dcl/asset-packs'

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

const componentsWithResources: Record<string, string> = {}

function handleResource<T>(type: string, key: keyof T) {
  componentsWithResources[type] = key.toString()
}

// Add resource handlers
handleResource<PBGltfContainer>(CoreComponents.GLTF_CONTAINER, 'src')
handleResource<PBAudioSource>(CoreComponents.AUDIO_SOURCE, 'audioClipUrl')
handleResource<PBVideoPlayer>(CoreComponents.VIDEO_PLAYER, 'src')

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
            const propertyName = componentsWithResources[componentName]
            const originalValue: string = processedComponentValue[propertyName]
            processedComponentValue[propertyName] = originalValue.replace(/^.*[/]([^/]+)$/, '{assetPath}/$1')
            resources.push(originalValue)
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
