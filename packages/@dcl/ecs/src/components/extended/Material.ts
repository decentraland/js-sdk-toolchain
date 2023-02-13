import { LastWriteWinElementSetComponentDefinition, Entity, IEngine } from '../../engine'
import { Material, PBMaterial, PBMaterial_PbrMaterial, PBMaterial_UnlitMaterial } from '../generated/index.gen'
import { AvatarTexture, Texture, TextureUnion, VideoTexture } from '../generated/types.gen'

/**
 * @public
 */
export interface TextureHelper {
  /**
   * @returns a common texture with a source file
   */
  Common: (texture: Texture) => TextureUnion

  /**
   * @returns the avatar texture of userId specified
   */
  Avatar: (avatarTexture: AvatarTexture) => TextureUnion

  /**
   * @returns the video texture of videoPlayerEntity specified
   */
  Video: (videoTexture: VideoTexture) => TextureUnion
}

/**
 * @public
 */
export interface MaterialComponentDefinitionExtended extends LastWriteWinElementSetComponentDefinition<PBMaterial> {
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
  },
  Video(videoTexture: VideoTexture) {
    return {
      tex: {
        $case: 'videoTexture',
        videoTexture
      }
    }
  }
}

export function defineMaterialComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): MaterialComponentDefinitionExtended {
  const theComponent = Material(engine)

  return {
    ...theComponent,
    Texture: TextureHelper,
    setBasicMaterial(entity: Entity, material: PBMaterial_UnlitMaterial) {
      theComponent.createOrReplace(entity, {
        material: {
          $case: 'unlit',
          unlit: material
        }
      })
    },
    setPbrMaterial(entity: Entity, material: PBMaterial_PbrMaterial) {
      theComponent.createOrReplace(entity, {
        material: {
          $case: 'pbr',
          pbr: material
        }
      })
    }
  }
}
