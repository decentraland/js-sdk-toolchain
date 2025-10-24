import path from 'path'
import {
  IEngine,
  Entity,
  Name,
  MeshRenderer,
  TextShape,
  NftShape,
  LightSource,
  GltfContainer,
  ComponentDefinition,
  PBLightSource,
  PBGltfContainer,
  PBMeshRenderer,
  PBTextShape,
  PBNftShape,
} from '@dcl/ecs/dist-cjs'

import { CliComponents } from '../../components'

interface ComponentNameGenerator<T = any> {
  component: ComponentDefinition<T>
  getName: (componentData: T | null) => string | null
}

function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

/**
 * Component priority list for name generation
 */
function getNameGenerators(): [
  ComponentNameGenerator<PBGltfContainer>,
  ComponentNameGenerator<PBMeshRenderer>,
  ComponentNameGenerator<PBTextShape>,
  ComponentNameGenerator<PBNftShape>,
  ComponentNameGenerator<PBLightSource>
] {
  return [
    {
      component: GltfContainer,
      getName: (data) => {
        if (data?.src) {
          const filename = path.basename(data.src)
          return path.parse(filename).name
        }
        return null
      }
    },
    {
      component: MeshRenderer,
      getName: (data) => {
        if (data?.mesh?.['$case']) {
          const meshType = data.mesh['$case']
          return meshType
        }
        return 'Mesh'
      }
    },
    {
      component: TextShape,
      getName: (data) => {
        if (data?.text) {
          const text = String(data.text).trim()
          const ellipsed = text.length > 10 ? text.substring(0, 10) + '...' : text
          return `Text: ${ellipsed}`
        }
        return 'Text'
      }
    },
    {
      component: NftShape,
      getName: () => 'NFT'
    },
    {
      component: LightSource,
      getName: () => 'Light'
    }
  ]
}

/**
 * Generates a name for an entity based on a specific component
 */
function generateNameFromComponent(
  generator: ComponentNameGenerator<any>,
  entity: Entity
): string | null {
  if (!generator.component.has(entity) || !('getOrNull' in generator.component)) {
    return null
  }

  const componentData = generator.component.getOrNull(entity)
  const name = generator.getName(componentData)
  return name ? capitalize(name) : null
}

/**
 * Generates Name components for entities that don't have them
 *
 * Automatically generates Name components for entities based on their other components.
 * This makes entities easier to identify and work with in the Creator Hub.
 */
export async function generateEntityNames(
  components: Pick<CliComponents, 'logger'>,
  engine: IEngine
): Promise<number> {
  const { logger } = components

  let createdCount = 0
  const processedEntities = new Set<number>()

  // iterate through entities with nameable components in priority order
  for (const generator of getNameGenerators()) {
    for (const [entity] of engine.getEntitiesWith(generator.component)) {
      // skip if already processed (entity may have multiple "nameable" components)
      if (processedEntities.has(entity)) continue
      processedEntities.add(entity)

      // skip reserved entities
      if (entity === engine.RootEntity || entity === engine.PlayerEntity || entity === engine.CameraEntity) {
        continue
      }

      // KNOWN ISSUE: The Name component is filtered out by the renderer transport during scene execution
      // because its componentId exceeds MAX_STATIC_COMPONENT (only core renderer components are sent).
      // See: https://github.com/decentraland/js-sdk-toolchain/blob/main/packages/%40dcl/sdk/src/internal/transports/rendererTransport.ts#L38
      // This means Name components created in scene code are lost during code-to-composite execution,
      // so Name.has(entity) will always return false here, causing custom names to be overwritten.
      // We keep this check for future reference in case the transport filtering changes.
      if (Name.has(entity)) continue

      const name = generateNameFromComponent(generator, entity)
      if (name) {
        Name.createOrReplace(entity, { value: name })
        createdCount++
        logger.log(`  ✓  Entity ${entity}: "${name}"`)
      }
    }
  }

  return createdCount
}
