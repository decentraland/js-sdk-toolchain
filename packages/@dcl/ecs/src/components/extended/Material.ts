import { ComponentDefinition, Entity, IEngine } from '../../engine'
import {
  PBMaterial_PbrMaterial,
  PBMaterial_UnlitMaterial
} from '../generated/index.gen'
import * as MaterialSchema from '../generated/Material.gen'
import { AvatarTexture, Texture, TextureUnion } from '../generated/types.gen'

/**
 * @public
 */
export type TextureHelper = {
  Common: (texture: Texture) => TextureUnion
  Avatar: (avatarTexture: AvatarTexture) => TextureUnion
}

/**
 * @public
 */
export interface MaterialComponentDefinition extends ComponentDefinition {
  Texture: TextureHelper
  setBasicMaterial: (entity: Entity, material: PBMaterial_UnlitMaterial) => void
  setPbrMaterial: (entity: Entity, material: PBMaterial_PbrMaterial) => void
}

const TextureHelper: TextureHelper = {
  Common(texture: Texture) {
    return {
      tex: {
        $case: 'texture',
        texture
      }
    }
  },
  Avatar(avatarTexture: AvatarTexture) {
    return {
      tex: {
        $case: 'avatarTexture',
        avatarTexture
      }
    }
  }
}

export function defineMaterialComponent(
  engine: Pick<IEngine, 'getComponent'>
): MaterialComponentDefinition {
  const Material = engine.getComponent<typeof MaterialSchema.MaterialSchema>(
    MaterialSchema.COMPONENT_ID
  )

  return {
    ...Material,
    Texture: TextureHelper,
    setBasicMaterial(entity: Entity, material: PBMaterial_UnlitMaterial) {
      Material.createOrReplace(entity, {
        material: {
          $case: 'unlit',
          unlit: material
        }
      })
    },
    setPbrMaterial(entity: Entity, material: PBMaterial_PbrMaterial) {
      Material.createOrReplace(entity, {
        material: {
          $case: 'pbr',
          pbr: material
        }
      })
    }
  }
}
