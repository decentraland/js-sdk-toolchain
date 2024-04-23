import future from 'fp-future'
import * as BABYLON from '@babylonjs/core'
import { GLTFFileLoader, GLTFLoaderAnimationStartMode } from '@babylonjs/loaders'
import { GLTFLoader } from '@babylonjs/loaders/glTF/2.0'
import { ComponentType, PBGltfContainer } from '@dcl/ecs'

import { markAsCollider } from '../colliders-utils'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { SceneContext } from '../SceneContext'
import { CAMERA, PLAYER } from '../../../sdk/tree'

let sceneContext: WeakRef<SceneContext>

BABYLON.SceneLoader.OnPluginActivatedObservable.add(function (plugin) {
  if (plugin instanceof GLTFFileLoader) {
    plugin.animationStartMode = GLTFLoaderAnimationStartMode.NONE
    plugin.compileMaterials = true
    plugin.validate = false
    plugin.createInstances = true
    plugin.animationStartMode = 0
    plugin.preprocessUrlAsync = async function (url: string) {
      // HERE BE DRAGONS 🐉:
      //  To hack the GLTF loader to use Decentraland's file system, we must
      //  access private properties to get the parent context to resolve individual
      //  files.
      //
      //  This Hack prevents the engine from caching the entire GLB/GLTF because
      //  query parameters are added to them. it is RECOMMENDED that the engine
      //  caches all the files by their name (CIDv1)
      const loader: GLTFLoader = (plugin as any)._loader
      const file: string = (loader as any)._fileName
      const [_gltfFilename, strParams] = file.split('?')
      if (strParams) {
        const params = new URLSearchParams(strParams)
        const base = params.get('base') || ''
        const ctx = sceneContext.deref()
        if (ctx) {
          const filePath = base + '/' + url
          console.log(`Fetching ${filePath}`)
          const content = await ctx.getFile(filePath)
          if (content) {
            // TODO: this works with File, but it doesn't match the types (it requires string)
            return new File([content], _gltfFilename) as any
          }
        }
      }
      throw new Error('Cannot resolve file ' + url)
    }
  }
})

export const putGltfContainerComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBGltfContainer | null
    updateGltfForEntity(entity, newValue)
  }
}

export const updateGltfForEntity = (entity: EcsEntity, newValue: PBGltfContainer | null) => {
  const currentValue = entity.ecsComponentValues.gltfContainer
  entity.ecsComponentValues.gltfContainer = newValue || undefined

  const shouldLoadGltf = !!newValue && currentValue?.src !== newValue?.src
  const shouldRemoveGltf = !newValue || shouldLoadGltf

  if (shouldRemoveGltf) removeGltf(entity)
  if (shouldLoadGltf) void loadGltf(entity, newValue.src)
}

export async function loadGltf(entity: EcsEntity, value: string) {
  const context = entity.context.deref()
  if (!context || !!entity.gltfContainer) return

  // store a WeakRef to the sceneContext to enable file resolver
  if (!sceneContext) {
    sceneContext = entity.context
  }

  let root = entity.getRoot()
  let attempts = 0

  while (root === null && attempts++ < 10) {
    // waiting for nodes to be loaded...
    await new Promise((resolve) => setTimeout(resolve, 100))
    root = entity.getRoot()
  }

  const shouldHide = root === PLAYER || root === CAMERA

  const loadingSpinner: BABYLON.Mesh | null = shouldHide ? null : createLoadingSpinner(entity, context.scene)

  try {
    await tryLoadGltfAsync(context.loadableScene.id, entity, value)
  } catch (error) {
    console.error('Error trying to load gltf ' + value, error)
  } finally {
    if (shouldHide) {
      entity.setVisibility(false)
    } else {
      loadingSpinner?.dispose(false, true)
    }
  }
}

export function removeGltf(entity: EcsEntity) {
  const context = entity.context.deref()
  if (!context) return

  if (entity.gltfContainer) {
    entity.gltfContainer.setEnabled(false)
    entity.gltfContainer.parent = null
    entity.gltfContainer.dispose(false, true)
    delete entity.gltfContainer
  }

  if (entity.gltfAssetContainer) {
    cleanupAssetContainer(context.scene, entity.gltfAssetContainer)
  }
}

async function tryLoadGltfAsync(sceneId: string, entity: EcsEntity, filePath: string) {
  const content = await entity.context.deref()!.getFile(filePath)
  if (!content) {
    return
  }

  const contextStillAlive = sceneContext.deref()
  if (!contextStillAlive) {
    return
  }

  if (entity.isGltfPathLoading()) {
    const loadingFilePath = await entity.getGltfPathLoading()
    if (loadingFilePath === filePath) {
      console.warn(
        `Asset ${filePath} for entity ${entity.entityId} is already being loaded. This call will be dismissed`
      )
      return
    }
  }

  entity.setGltfPathLoading()

  const base = filePath.split('/').slice(0, -1).join('/')
  const finalSrc = filePath + '?sceneId=' + encodeURIComponent(sceneId) + '&base=' + encodeURIComponent(base)

  const file = new File([content], finalSrc)
  const extension = filePath.toLowerCase().endsWith('.gltf') ? '.gltf' : '.glb'

  const loadAssetFuture = future<void>()

  loadAssetContainer(
    file,
    entity.getScene(),
    (assetContainer) => {
      processGLTFAssetContainer(assetContainer)

      /*
        The purpose of this is to solve the following issue: 
        When the scene is reloaded, the gltfs are loaded from two places, a useEffect in the Renderer.tsx component, and the CRDT messages coming from the engine.
        That could cause GLTFs from being loaded twice in the babylon engine, so in order to avoid that, the loop below empties the entity from any previous GLTF loaded, so if it was loaded twice, the second time would clear the first load and it wouldn't end up duplicated.
        The problem with that approach is that it would also remove any other entity that was nested onto the parent, and this would mess up the entity tree when the scene is loaded for the first time, that's why the loop needs to skip any node that is an EcsEntity, so it doesn't remove the entity from the tree.
      */
      const prevChildren = entity.getChildren()
      for (const child of prevChildren) {
        if (child instanceof EcsEntity) continue // skip EcsEntity nodes, only remove gltf related stuff
        child.setEnabled(false)
        child.dispose(false, true)
      }

      // Find the main mesh and add it as the BasicShape.nameInEntity component.
      assetContainer.meshes
        .filter(($) => $.name === '__root__')
        .forEach((mesh) => {
          mesh.parent = entity
          entity.setGltfContainer(mesh)
        })
      entity.generateBoundingBox()
      entity.setGltfAssetContainer(assetContainer)
      entity.resolveGltfPathLoading(filePath)
      loadAssetFuture.resolve()
    },
    undefined,
    (_scene, message, _exception) => {
      console.error('Error while calling LoadAssetContainer: ', message, _exception)
      entity.resolveGltfPathLoading(filePath)
      loadAssetFuture.reject(new Error(message))
    },
    extension
  )

  return loadAssetFuture
}

export function loadAssetContainer(
  file: File,
  scene: BABYLON.Scene,
  onSuccess?: (assetContainer: BABYLON.AssetContainer) => void,
  onProgress?: (event: BABYLON.ISceneLoaderProgressEvent) => void,
  onError?: (scene: BABYLON.Scene, message: string, exception?: any) => void,
  pluginExtension?: string,
  name?: string
) {
  BABYLON.SceneLoader.LoadAssetContainer('', file, scene, onSuccess, onProgress, onError, pluginExtension, name)
}

export function processGLTFAssetContainer(assetContainer: BABYLON.AssetContainer) {
  assetContainer.meshes.forEach((mesh) => {
    if (mesh instanceof BABYLON.Mesh) {
      if (mesh.geometry && !assetContainer.geometries.includes(mesh.geometry)) {
        assetContainer.geometries.push(mesh.geometry)
      }
      if (mesh.material instanceof BABYLON.Material) {
        mesh.material.alphaMode = 0
      }
    }
    mesh.subMeshes &&
      mesh.subMeshes.forEach((subMesh) => {
        const mesh = subMesh.getMesh()
        if (mesh instanceof BABYLON.Mesh) {
          if (mesh.geometry && !assetContainer.geometries.includes(mesh.geometry)) {
            assetContainer.geometries.push(mesh.geometry)
          }
        }
      })

    // Find all the materials from all the meshes and add to $.materials
    mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY
    if (mesh.material) {
      if (!assetContainer.materials.includes(mesh.material)) {
        assetContainer.materials.push(mesh.material)
      }
    }
  })

  processColliders(assetContainer)

  // Find the textures in the materials that share the same domain as the context
  // then add the textures to the $.textures
  assetContainer.materials.forEach((material: BABYLON.Material | BABYLON.PBRMaterial) => {
    for (const i in material) {
      const t = (material as any)[i]

      if (i.endsWith('Texture') && t instanceof BABYLON.Texture) {
        if (!assetContainer.textures.includes(t)) {
          // if (isSceneTexture(t)) {
          assetContainer.textures.push(t)
          // }
        }
      }
    }

    if ('albedoTexture' in material) {
      if (material.alphaMode === 2) {
        if (material.albedoTexture) {
          material.albedoTexture.hasAlpha = true
          material.useAlphaFromAlbedoTexture = true
        }
      }
    }
  })

  for (const ag of assetContainer.animationGroups) {
    ag.stop()
    for (const animatable of ag.animatables) {
      animatable.weight = 0
    }
  }

  assetContainer.addAllToScene()
}

// eslint-disable-next-line @typescript-eslint/ban-types
function disposeDelegate($: { dispose: Function }) {
  $.dispose()
}

function disposeNodeDelegate($: BABYLON.Node | null) {
  if (!$) return
  $.setEnabled(false)
  $.parent = null
  $.dispose(false)
}

function disposeSkeleton($: BABYLON.Skeleton) {
  $.dispose()
  $.bones.forEach(($) => {
    $.parent = null
    $.dispose()
  })
}

function disposeAnimatable($: BABYLON.Animatable | null) {
  if (!$) return
  $.disposeOnEnd = true
  $.loopAnimation = false
  $.stop()
  $._animate(0)
}

export function disposeAnimationGroups(scene: BABYLON.Scene, $: BABYLON.AnimationGroup) {
  $.animatables.forEach(disposeAnimatable)

  $.targetedAnimations.forEach(($) => {
    disposeAnimatable(scene.getAnimatableByTarget($.target))
  })

  $.dispose()
}

export function cleanupAssetContainer(scene: BABYLON.Scene, $: BABYLON.AssetContainer) {
  if ($) {
    $.removeAllFromScene()
    $.transformNodes && $.transformNodes.forEach(disposeNodeDelegate)
    $.rootNodes && $.rootNodes.forEach(disposeNodeDelegate)
    $.meshes && $.meshes.forEach(disposeNodeDelegate)
    // Textures disposals are handled by monkeyLoader.ts
    // NOTE: $.textures && $.textures.forEach(disposeDelegate)
    $.animationGroups && $.animationGroups.forEach(($) => disposeAnimationGroups(scene, $))
    $.multiMaterials && $.multiMaterials.forEach(disposeDelegate)
    $.sounds && $.sounds.forEach(disposeDelegate)
    $.skeletons && $.skeletons.forEach(disposeSkeleton)
    $.materials && $.materials.forEach(disposeDelegate)
    $.lights && $.lights.forEach(disposeDelegate)
  }
}

function processColliders($: BABYLON.AssetContainer) {
  for (let i = 0; i < $.meshes.length; i++) {
    const mesh = $.meshes[i]

    if (mesh.name.toLowerCase().includes('collider')) {
      mesh.checkCollisions = true
      mesh.visibility = 0
      mesh.isPickable = false
      markAsCollider(mesh)
    } else {
      mesh.isPickable = true
    }
  }
}

function createSemiTorus(
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number,
  color: BABYLON.Color3,
  scene: BABYLON.Scene
): BABYLON.Mesh {
  const positions = []
  const indices = []

  const angleStep = arc / radialSegments
  const radiusStep = tube / tubularSegments

  for (let i = 0; i <= radialSegments; i++) {
    const angle = i * angleStep
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)

    for (let j = 0; j <= tubularSegments; j++) {
      const currentRadius = radius + j * radiusStep
      const x = currentRadius * cosAngle
      const y = currentRadius * sinAngle
      const z = 0

      positions.push(x, y, z)

      if (i < radialSegments && j < tubularSegments) {
        const nextRow = tubularSegments + 1
        const nextIndex = i * nextRow + j

        indices.push(nextIndex, nextIndex + nextRow, nextIndex + 1)
        indices.push(nextIndex + nextRow, nextIndex + nextRow + 1, nextIndex + 1)
      }
    }
  }

  const semiTorus = new BABYLON.Mesh('semiTorus', scene)
  const vertexData = new BABYLON.VertexData()

  vertexData.positions = positions
  vertexData.indices = indices

  vertexData.applyToMesh(semiTorus)

  const material = new BABYLON.StandardMaterial('semiTorusMaterial', scene)
  material.diffuseColor = color

  semiTorus.material = material

  return semiTorus
}

/**
 * Creates a loading spinner mesh.
 * @param entity - The entity to attach the loading spinner to.
 * @param scene - The BABYLON.Scene instance.
 * @param radius - The radius of the loading spinner.
 * @param tube - The tube diameter of the loading spinner.
 * @param radialSegments - The number of radial segments of the loading spinner.
 * @param tubularSegments - The number of tubular segments of the loading spinner.
 * @returns The created loading spinner mesh.
 */
function createLoadingSpinner(
  entity: EcsEntity,
  scene: BABYLON.Scene,
  radius: number = 0.15,
  tube: number = 0.05,
  radialSegments: number = 32,
  tubularSegments: number = 16
): BABYLON.Mesh {
  const CIRCLE = Math.PI * 2
  const LIGHT_GRAY = new BABYLON.Color3(0.9, 0.9, 0.9)
  const torusOutline = createSemiTorus(radius, tube, radialSegments, tubularSegments, CIRCLE, LIGHT_GRAY, scene)
  torusOutline.position.copyFrom(entity.getAbsolutePosition())
  torusOutline.position.y += 1
  torusOutline.rotation.x = Math.PI
  torusOutline.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL

  const LIGHT_RED = new BABYLON.Color3(1, 45 / 255, 85 / 255)
  const semiTorus = createSemiTorus(radius, tube, radialSegments, tubularSegments, CIRCLE / 4, LIGHT_RED, scene)
  semiTorus.position.z += 0.001
  semiTorus.parent = torusOutline

  const rotationAnimation = new BABYLON.Animation(
    'semiTorusRotation',
    'rotation.z',
    30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
  )

  rotationAnimation.setKeys([
    { frame: 0, value: 0 },
    { frame: 100, value: CIRCLE }
  ])

  const animationGroup = new BABYLON.AnimationGroup('loadingSpinnerAnimation')
  animationGroup.addTargetedAnimation(rotationAnimation, semiTorus)
  animationGroup.play(true)

  torusOutline.onDisposeObservable.add(() => {
    animationGroup.dispose()
    if (torusOutline.material) {
      torusOutline.material.dispose()
    }
    if (semiTorus.material) {
      semiTorus.material.dispose()
    }
    semiTorus.dispose(false, true)
  })

  return torusOutline
}
