import { ComponentDefinition, CompositeDefinition, DeepReadonlyObject, Entity } from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { dataCompare } from '@dcl/ecs/dist/systems/crdt/utils'

import { EditorComponentsTypes, SceneAgeRating, SceneCategory, SceneComponent } from '../../../sdk/components'
import { Scene } from '@dcl/schemas'

export function isEqual(component: ComponentDefinition<unknown>, prevValue: unknown, newValue: unknown) {
  if (prevValue === newValue || (!prevValue && !newValue)) return true
  if ((!prevValue && newValue) || (prevValue && !newValue)) return false
  const prevBuffer = new ReadWriteByteBuffer()
  const newBuffer = new ReadWriteByteBuffer()
  component.schema.serialize(prevValue as DeepReadonlyObject<unknown>, prevBuffer)
  component.schema.serialize(newValue as DeepReadonlyObject<unknown>, newBuffer)
  return dataCompare(prevBuffer.toBinary(), newBuffer.toBinary()) === 0
}

export function findPrevValue(composite: CompositeDefinition, componentName: string, entity: Entity) {
  const component = composite.components.find((c) => c.name === componentName)
  const value = component?.data.get(entity)
  if (value?.data?.$case !== 'json') {
    return null
  }
  return value.data.json
}

const parseCoords = (coords: string) => {
  const [x, y] = coords.split(',')
  return { x: parseInt(x), y: parseInt(y) }
}

type SceneWithRating = Scene & { rating: SceneAgeRating }

export function fromSceneComponent(value: DeepReadonlyObject<EditorComponentsTypes['Scene']>): Partial<Scene> {
  const tags: string[] = []
  for (const category of value.categories || []) {
    tags.push(category)
  }
  for (const tag of value.tags || []) {
    const sanitizedTag = tag.trim()
    if (sanitizedTag && !tags.includes(sanitizedTag)) tags.push(sanitizedTag)
  }
  const scene: Partial<SceneWithRating> = {
    display: {
      title: value.name || '',
      description: value.description || '',
      navmapThumbnail: value.thumbnail || ''
    },
    scene: {
      parcels: value.layout.parcels.map(($) => `${$.x},${$.y}`),
      base: `${value.layout.base.x},${value.layout.base.y}`
    },
    contact: {
      name: value.author || '',
      email: value.email || ''
    },
    tags,
    spawnPoints: value.spawnPoints
      ? value.spawnPoints.map((spawnPoint) => ({
          name: spawnPoint.name,
          default: spawnPoint.default,
          position: {
            x: spawnPoint.position.x.value as number[],
            y: spawnPoint.position.y.value as number[],
            z: spawnPoint.position.z.value as number[]
          },
          cameraTarget: spawnPoint.cameraTarget
        }))
      : [],
    featureToggles: {
      voiceChat: value.silenceVoiceChat ? 'disabled' : 'enabled',
      portableExperiences: value.disablePortableExperiences ? 'disabled' : 'enabled'
    },
    rating: value.ageRating
  }

  return scene
}

export function toSceneComponent(value: Scene): EditorComponentsTypes['Scene'] {
  const categories: SceneCategory[] = []
  const tags: string[] = []

  for (const tag of value.tags || []) {
    if (Object.values(SceneCategory).includes(tag as SceneCategory)) {
      categories.push(tag as SceneCategory)
    } else {
      tags.push(tag)
    }
  }

  const scene: SceneComponent = {
    name: value.display?.title || '',
    description: value.display?.description || '',
    thumbnail: value.display?.navmapThumbnail || '',
    layout: {
      parcels: value.scene.parcels.map(($) => parseCoords($)),
      base: parseCoords(value.scene.base)
    },
    author: value.contact?.name || '',
    email: value.contact?.email || '',
    categories,
    tags,
    silenceVoiceChat: value.featureToggles?.voiceChat === 'disabled',
    disablePortableExperiences: value.featureToggles?.portableExperiences === 'disabled',
    ageRating: (value as SceneWithRating).rating,
    spawnPoints: value.spawnPoints?.map((spawnPoint, index) => ({
      name: spawnPoint.name || `Spawn Point ${index + 1}`,
      default: spawnPoint.default,
      position: {
        x: Array.isArray(spawnPoint.position.x)
          ? { $case: 'range', value: spawnPoint.position.x }
          : { $case: 'single', value: spawnPoint.position.x },
        y: Array.isArray(spawnPoint.position.y)
          ? { $case: 'range', value: spawnPoint.position.y }
          : { $case: 'single', value: spawnPoint.position.y },
        z: Array.isArray(spawnPoint.position.z)
          ? { $case: 'range', value: spawnPoint.position.z }
          : { $case: 'single', value: spawnPoint.position.z }
      },
      cameraTarget: spawnPoint.cameraTarget
    }))
  }

  return scene
}
