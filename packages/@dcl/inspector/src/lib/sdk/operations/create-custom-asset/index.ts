import {
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  PBAudioSource,
  PBGltfContainer,
  PBVideoPlayer
} from '@dcl/ecs'
import { AssetData } from '../../../logic/catalog'
import { CoreComponents } from '../../components'

const BASE_ENTITY_ID = 512
const SINGLE_ENTITY_ID = 0

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
    const components = engine.componentsIter()
    const resources: string[] = []
    const composite: AssetData['composite'] = {
      version: 1,
      components: []
    }

    // Create a map to store components by their name
    const componentsByName: Record<string, { data: Record<string, { json: any }> }> = {}

    entities.forEach((entity, index) => {
      // Determine the target entity ID based on whether we have single or multiple entities
      const targetEntityId = entities.length === 1 ? SINGLE_ENTITY_ID.toString() : (BASE_ENTITY_ID + index).toString()

      // Process each component for the current entity
      for (const component of components) {
        const { componentId, componentName } = component
        const Component = engine.getComponent(componentId) as LastWriteWinElementSetComponentDefinition<unknown>

        if (!Component.has(entity)) continue
        const componentValue = Component.get(entity)
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

    // Convert the map to the final composite format
    composite.components = Object.entries(componentsByName).map(([name, data]) => ({
      name,
      data: data.data
    }))

    return { composite, resources }
  }
}

export default createCustomAsset
