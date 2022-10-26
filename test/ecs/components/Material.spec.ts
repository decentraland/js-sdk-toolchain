import { MaterialTransparencyMode } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/material.gen'
import {
  TextureFilterMode,
  TextureWrapMode
} from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/common/texture.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated Material ProtoBuf', () => {
  it('should serialize/deserialize Material', () => {
    const newEngine = Engine()
    const { Material } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _material = Material.create(entity, {
      ...Material.default(),
      texture: {
        tex: {
          $case: 'avatarTexture',
          avatarTexture: {
            userId: 'user-id-dummy',
            wrapMode: TextureWrapMode.TWM_CLAMP,
            filterMode: undefined
          }
        }
      },
      alphaTexture: {
        tex: {
          $case: 'texture',
          texture: {
            filterMode: undefined,
            wrapMode: undefined,
            src: 'not-casla'
          }
        }
      },
      castShadows: true,
      glossiness: 1,
      metallic: 1,
      roughness: 1,
      specularIntensity: 0,
      albedoColor: { r: 0, g: 1, b: 1 },
      alphaTest: 0,
      directIntensity: 1,
      emissiveIntensity: 1,
      emissiveColor: { r: 0, g: 1, b: 1 },
      reflectivityColor: { r: 0, g: 1, b: 1 },
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })

    Material.create(entityB, {
      albedoColor: { r: 0, g: 1, b: 1 },
      alphaTest: 1,
      alphaTexture: {
        tex: {
          $case: 'texture',
          texture: {
            wrapMode: TextureWrapMode.TWM_CLAMP,
            filterMode: TextureFilterMode.TFM_BILINEAR,
            src: 'not-casla'
          }
        }
      },
      bumpTexture: {
        tex: {
          $case: 'texture',
          texture: {
            wrapMode: TextureWrapMode.TWM_MIRROR,
            filterMode: TextureFilterMode.TFM_POINT,
            src: 'not-casla'
          }
        }
      },
      emissiveTexture: {
        tex: {
          $case: 'texture',
          texture: {
            wrapMode: TextureWrapMode.TWM_MIRROR_ONCE,
            filterMode: TextureFilterMode.TFM_TRILINEAR,
            src: 'not-casla'
          }
        }
      },
      texture: {
        tex: {
          $case: 'avatarTexture',
          avatarTexture: {
            userId: '',
            wrapMode: TextureWrapMode.TWM_REPEAT,
            filterMode: undefined
          }
        }
      },
      castShadows: true,
      directIntensity: 1,
      emissiveColor: { r: 0, g: 0, b: 1 },
      reflectivityColor: { r: 0, g: 0, b: 1 },
      emissiveIntensity: 0,
      glossiness: 0.5,
      metallic: 1,
      roughness: 1,
      specularIntensity: 0,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    const buffer = Material.toBinary(entity)
    Material.updateFromBinary(entityB, buffer)

    const m = Material.getMutable(entityB)
    expect(_material).toBeDeepCloseTo(m as any)

    expect(Material.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...Material.getMutable(entity)
    } as any)
  })
})
