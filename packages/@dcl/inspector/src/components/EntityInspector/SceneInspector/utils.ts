import { areConnected } from '@dcl/ecs'
import { SceneInput, SpawnPointInput } from './types'
import {
  EditorComponentsTypes,
  SceneAgeRating,
  SceneCategory,
  SceneSpawnPoint,
  SceneSpawnPointCoord
} from '../../../lib/sdk/components'
import { Coords } from '../../../lib/utils/layout'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { isAssetNode } from '../../ProjectAssetExplorer/utils'
import { ACCEPTED_FILE_TYPES } from '../../ui/FileUploadField/types'

function getValue(coord: SceneSpawnPointCoord) {
  return coord.$case === 'range' ? (coord.value[0] + coord.value[1]) / 2 : coord.value
}

function getOffset(value: number | number[]) {
  return Array.isArray(value) ? (value[1] - value[0]) / 2 : 0
}

function toValue(value: number, offset: number): SceneSpawnPointCoord {
  return {
    $case: 'range',
    value: [value - offset, value + offset]
  }
}

export function fromSceneSpawnPoint(spawnPoint: SceneSpawnPoint): SpawnPointInput {
  const axes = [spawnPoint.position.x.value, spawnPoint.position.y.value, spawnPoint.position.z.value]
  const randomOffset = axes.some(Array.isArray)
  return {
    position: {
      x: getValue(spawnPoint.position.x),
      y: getValue(spawnPoint.position.y),
      z: getValue(spawnPoint.position.z)
    },
    randomOffset,
    maxOffset: randomOffset ? axes.reduce<number>((offset, axis) => Math.max(offset, getOffset(axis)), 0) : 0,
    cameraTarget: spawnPoint.cameraTarget || {
      x: 8,
      y: 1,
      z: 8
    }
  }
}

export function toSceneSpawnPoint(name: string, spawnPointInput: SpawnPointInput): SceneSpawnPoint {
  return {
    name,
    default: true,
    position: {
      x: toValue(spawnPointInput.position.x, spawnPointInput.maxOffset),
      y: toValue(spawnPointInput.position.y, 0),
      z: toValue(spawnPointInput.position.z, spawnPointInput.maxOffset)
    },
    cameraTarget: spawnPointInput.cameraTarget
  }
}

export function fromScene(value: EditorComponentsTypes['Scene']): SceneInput {
  const parcels = value.layout.parcels.map((parcel) => parcel.x + ',' + parcel.y).join(' ')
  return {
    name: value.name || 'My Scene',
    description: value.description || '',
    thumbnail: value.thumbnail || 'assets/scene/thumbnail.png',
    ageRating: value.ageRating || SceneAgeRating.Teen,
    categories: value.categories || [],
    tags: value.tags ? value.tags.join(', ') : '',
    author: value.author || '',
    email: value.email || '',
    worldConfiguration: {
      skyboxConfig: {
        fixedTime: String(value.worldConfiguration?.skyboxConfig?.fixedTime || MIDDAY_SECONDS)
      }
    },
    silenceVoiceChat: typeof value.silenceVoiceChat === 'boolean' ? value.silenceVoiceChat : false,
    disablePortableExperiences:
      typeof value.disablePortableExperiences === 'boolean' ? value.disablePortableExperiences : false,
    spawnPoints: Array.isArray(value.spawnPoints)
      ? value.spawnPoints.map((spawnPoint) => fromSceneSpawnPoint(spawnPoint))
      : [],
    layout: {
      base: `${value.layout.base.x},${value.layout.base.y}`,
      parcels
    }
  }
}

export function toScene(inputs: SceneInput): EditorComponentsTypes['Scene'] {
  return {
    name: inputs.name,
    description: inputs.description,
    thumbnail: inputs.thumbnail,
    ageRating: inputs.ageRating as SceneAgeRating,
    categories: inputs.categories as SceneCategory[],
    tags: inputs.tags.split(',').map((tag) => tag.trim()),
    author: inputs.author,
    email: inputs.email,
    worldConfiguration: {
      skyboxConfig: {
        fixedTime: Number(inputs.worldConfiguration.skyboxConfig.fixedTime || MIDDAY_SECONDS)
      }
    },
    silenceVoiceChat: inputs.silenceVoiceChat,
    disablePortableExperiences: inputs.disablePortableExperiences,
    spawnPoints: inputs.spawnPoints.map((spawnPoint, index) =>
      toSceneSpawnPoint(`Spawn Point ${index + 1}`, spawnPoint)
    ),
    layout: {
      base: parseParcels(inputs.layout.base)[0],
      parcels: parseParcels(inputs.layout.parcels)
    }
  }
}

export function parseParcels(value: string): Coords[] {
  const parcels = value.split(' ')
  const coordsList: Coords[] = []

  for (const parcel of parcels) {
    const coords = parcel.split(',')
    const x = parseInt(coords[0])
    const y = parseInt(coords[1])
    if (coords.length !== 2 || isNaN(x) || isNaN(y)) return []
    coordsList.push({ x, y })
  }

  return coordsList
}

export function isValidInput(input: SceneInput): boolean {
  const parcels = parseParcels(input.layout.parcels)
  const baseList = parseParcels(input.layout.base)
  return baseList.length === 1 && input.layout.parcels.includes(input.layout.base) && areConnected(parcels)
}

export const isImageFile = (value: string): boolean =>
  ACCEPTED_FILE_TYPES['image'].some((extension) => value.endsWith(extension))

export const isImage = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isImageFile(node.name)

export const MIDDAY_SECONDS = 43200
