import { BodyShape, EmoteCategory, EmoteWithBlobs, WearableCategory, WearableWithBlobs } from '@dcl/schemas'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'

export function toWearableWithBlobs(file: File, resources: File[] = []): WearableWithBlobs {
  return {
    id: file.name,
    name: '',
    description: '',
    image: '',
    thumbnail: '',
    i18n: [],
    data: {
      category: WearableCategory.HAT,
      hides: [],
      replaces: [],
      tags: [],
      representations: [
        {
          bodyShapes: [BodyShape.MALE, BodyShape.FEMALE],
          mainFile: file.name,
          contents: [
            {
              key: file.name,
              blob: file
            },
            ...resources.map((resource) => ({
              key: resource.name,
              blob: resource
            }))
          ],
          overrideHides: [],
          overrideReplaces: []
        }
      ]
    }
  }
}

export function toEmoteWithBlobs(file: File, resources: File[] = []): EmoteWithBlobs {
  return {
    id: file.name,
    name: file.name,
    description: '',
    image: '',
    thumbnail: '',
    i18n: [],
    emoteDataADR74: {
      category: EmoteCategory.DANCE,
      tags: [],
      representations: [
        {
          bodyShapes: [BodyShape.MALE, BodyShape.FEMALE],
          mainFile: file.name || 'model.glb',
          contents: [
            {
              key: file.name,
              blob: file
            },
            ...resources?.map((resource) => ({
              key: resource.name,
              blob: resource
            }))
          ]
        }
      ],
      loop: false
    }
  }
}

export async function isEmote(file: File): Promise<boolean> {
  const url = URL.createObjectURL(file)
  const canvas = document.createElement('canvas')
  const engine = new Engine(canvas, false)
  const scene = new Scene(engine)

  try {
    const result = await SceneLoader.LoadAssetContainerAsync(
      '',
      url,
      scene,
      undefined,
      file.name.endsWith('.gltf') ? '.gltf' : '.glb'
    )

    const armature = result.transformNodes.find((node) => node.name === 'Armature')
    if (!armature) return false

    const hasAvatarChildren = armature.getChildren().some((child) => child.name.startsWith('Avatar_'))

    return hasAvatarChildren
  } catch (err) {
    console.error('Error checking if file is emote:', err)
    return false
  } finally {
    URL.revokeObjectURL(url)
    scene.dispose()
    engine.dispose()
  }
}
