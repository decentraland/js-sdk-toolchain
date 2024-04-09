import { PBRMaterial, Scene, StandardMaterial, Texture, Vector3 } from '@babylonjs/core'
import { PBMaterial, ComponentType, MaterialTransparencyMode, TextureUnion } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { memoize } from '../../../logic/once'

export const putMaterialComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBMaterial | null
    const newMaterialType = newValue?.material?.$case

    const currentMaterialType = !entity.material
      ? 'undefined'
      : entity.material instanceof PBRMaterial
      ? 'pbr'
      : 'unlit'

    const materialNeedsRegeneration = currentMaterialType !== newMaterialType

    if (materialNeedsRegeneration) {
      entity.material?.dispose(true, true)
      entity.material = undefined
      switch (newMaterialType) {
        case 'pbr':
          entity.material = new PBRMaterial(entity.entityId.toString(), entity.getScene())
          break
        case 'unlit':
          entity.material = new StandardMaterial(entity.entityId.toString(), entity.getScene())
          break
      }
    }

    // need to optimize this...
    disposeTextures(entity.material)

    if (entity.material instanceof PBRMaterial && newValue?.material?.$case === 'pbr') {
      const { pbr } = newValue.material

      entity.material.atomicMaterialsUpdate((m) => {
        if (pbr.albedoColor) {
          m.albedoColor.set(pbr.albedoColor.r, pbr.albedoColor.g, pbr.albedoColor.b)
          m.alpha = pbr.albedoColor.a
        } else {
          m.albedoColor.set(1, 1, 1)
          m.alpha = 1
        }

        pbr.emissiveColor && m.emissiveColor.set(pbr.emissiveColor.r, pbr.emissiveColor.g, pbr.emissiveColor.b)
        pbr.reflectivityColor &&
          m.reflectivityColor.set(pbr.reflectivityColor.r, pbr.reflectivityColor.g, pbr.reflectivityColor.b)

        if (pbr.transparencyMode === MaterialTransparencyMode.MTM_ALPHA_BLEND) {
          m.transparencyMode = 2
        } else if (pbr.transparencyMode === MaterialTransparencyMode.MTM_AUTO) {
          m.transparencyMode = 1
        } else if (pbr.transparencyMode === MaterialTransparencyMode.MTM_OPAQUE) {
          m.transparencyMode = 0
        } else if (pbr.transparencyMode === MaterialTransparencyMode.MTM_ALPHA_TEST_AND_ALPHA_BLEND) {
          m.transparencyMode = 3
        }

        m.metallic = pbr.metallic ?? 0.5
        m.roughness = pbr.roughness ?? 0.5

        m.specularIntensity = pbr.specularIntensity ?? 1
        m.emissiveIntensity = pbr.emissiveIntensity ?? 2
        m.directIntensity = pbr.directIntensity ?? 1
        m.alphaCutOff = pbr.alphaTest ?? 0.5

        void loadTexture(entity, pbr.texture?.tex).then((texture) => (m.albedoTexture = texture))
        void loadTexture(entity, pbr.alphaTexture?.tex).then((texture) => (m.opacityTexture = texture))
        void loadTexture(entity, pbr.bumpTexture?.tex).then((texture) => (m.bumpTexture = texture))
        void loadTexture(entity, pbr.emissiveTexture?.tex).then((texture) => (m.emissiveTexture = texture))
      })
    } else if (entity.material instanceof StandardMaterial && newValue?.material?.$case === 'unlit') {
      const { unlit } = newValue.material

      entity.material.atomicMaterialsUpdate((m) => {
        m.alphaCutOff = unlit.alphaTest ?? 0.5
        unlit.diffuseColor && m.diffuseColor.set(unlit.diffuseColor.r, unlit.diffuseColor.g, unlit.diffuseColor.b) // unlit.albedoColor.a?
        void loadTexture(entity, unlit.texture?.tex).then((texture) => (m.diffuseTexture = texture))
      })
    }

    if (newValue) {
      entity.ecsComponentValues.material = newValue
    } else {
      delete entity.ecsComponentValues.material
    }

    setMeshRendererMaterial(entity)
  }
}

export const baseMaterial = memoize((scene: Scene) => {
  const material = new StandardMaterial('base-box', scene)
  return material
})

export function setMeshRendererMaterial(entity: EcsEntity) {
  const material = entity.material ?? baseMaterial(entity.getScene())
  const mesh = entity.meshRenderer
  if (mesh) {
    mesh.material = material
    mesh.scaling = new Vector3(1, 1, -1)
  }
}

async function loadTexture(entity: EcsEntity, tx: TextureUnion['tex']): Promise<Texture | null> {
  if (!tx) return null
  if (tx.$case === 'texture') {
    return entity.context
      .deref()!
      .getFile(tx.texture.src)
      .then((content) => {
        if (!content) return null
        const textureBlob = new Blob([content])
        const textureUrl = URL.createObjectURL(textureBlob)
        return new Texture(textureUrl, entity.getScene(), true, false)
      })
  }

  return null
}

function disposeTextures(material?: StandardMaterial | PBRMaterial) {
  if (material instanceof StandardMaterial) {
    material.diffuseTexture?.dispose()
    material.diffuseTexture = null
  }

  if (material instanceof PBRMaterial) {
    material.albedoTexture?.dispose()
    material.albedoTexture = null
    material.opacityTexture?.dispose()
    material.opacityTexture = null
    material.bumpTexture?.dispose()
    material.bumpTexture = null
    material.emissiveTexture?.dispose()
    material.emissiveTexture = null
  }
}
