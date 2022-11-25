import { ComponentDefinition, Entity, IEngine, ISchema } from '../../engine'
import {
  PBMaterial,
  PBMaterial_PbrMaterial,
  PBMaterial_UnlitMaterial
} from '../generated/index.gen'
import * as MaterialSchema from '../generated/Material.gen'
import { AvatarTexture, Texture, TextureUnion } from '../generated/types.gen'

/**
 * @public
 */
export type TextureHelper = {
  /**
   * @returns a common texture with a source file
   */
  Common: (texture: Texture) => TextureUnion

  /**
   * @returns the avatar texture of userId specified
   */
  Avatar: (avatarTexture: AvatarTexture) => TextureUnion
}

/**
 * @public
 */
export interface MaterialComponentDefinition
  extends ComponentDefinition<ISchema<PBMaterial>, PBMaterial> {
  /**
   * Texture helpers with constructor
   */
  Texture: TextureHelper

  /**
   * Create or replace the component Material in the entity specified
   * @param entity - the entity to link the component
   * @param material - the Unlit data for this material
   */
  setBasicMaterial: (entity: Entity, material: PBMaterial_UnlitMaterial) => void

  /**
   * Create or replace the component Material in the entity specified
   * @param entity - the entity to link the component
   * @param material - the PBR data for this material
   */
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
  const Material: ComponentDefinition<
    ISchema<PBMaterial>,
    PBMaterial
  > = engine.getComponent<typeof MaterialSchema.MaterialSchema>(
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
