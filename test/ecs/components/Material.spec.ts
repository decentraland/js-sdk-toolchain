import {
  Engine,
  components,
  TextureFilterMode,
  TextureWrapMode,
  MaterialTransparencyMode,
  PBMaterial,
  PBMaterial_PbrMaterial,
  PBMaterial_UnlitMaterial,
  VideoPlayer
} from '../../../packages/@dcl/ecs/src'

import { testComponentSerialization } from './assertion'

function createPbrMaterial(pbr: PBMaterial_PbrMaterial): PBMaterial {
  return {
    material: {
      $case: 'pbr',
      pbr
    }
  }
}

function createUnlitMaterial(unlit: PBMaterial_UnlitMaterial): PBMaterial {
  return {
    material: {
      $case: 'unlit',
      unlit
    }
  }
}

describe('Generated Material ProtoBuf', () => {
  it('should serialize/deserialize Material', () => {
    const newEngine = Engine()
    const Material = components.Material(newEngine)

    testComponentSerialization(
      Material,
      createPbrMaterial({
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
        metallic: 1,
        roughness: 1,
        specularIntensity: 0,
        albedoColor: { r: 0, g: 1, b: 1, a: 1 },
        alphaTest: 0,
        directIntensity: 1,
        emissiveIntensity: 1,
        emissiveColor: { r: 0, g: 1, b: 1 },
        reflectivityColor: { r: 0, g: 1, b: 1 },
        transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
        bumpTexture: undefined,
        emissiveTexture: undefined
      })
    )

    testComponentSerialization(
      Material,
      createPbrMaterial({
        albedoColor: { r: 0, g: 1, b: 1, a: 1 },
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
              wrapMode: TextureWrapMode.TWM_MIRROR,
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
        metallic: 1,
        roughness: 1,
        specularIntensity: 0,
        transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
      })
    )

    testComponentSerialization(
      Material,
      createUnlitMaterial({
        castShadows: true,
        diffuseColor: { r: 0, g: 1, b: 1, a: 1 },
        alphaTest: undefined,
        texture: undefined
      })
    )
  })

  it('should test all helper cases', () => {
    const newEngine = Engine()
    const Material = components.Material(newEngine)
    const entity = newEngine.addEntity()

    expect(Material.getOrNull(entity)).toBeNull()

    Material.setBasicMaterial(entity, {
      texture: Material.Texture.Common({
        src: 'someTexture.png'
      })
    })

    expect(Material.get(entity)).toStrictEqual<PBMaterial>({
      material: {
        $case: 'unlit',
        unlit: {
          texture: {
            tex: {
              $case: 'texture',
              texture: {
                src: 'someTexture.png'
              }
            }
          }
        }
      }
    })

    Material.setPbrMaterial(entity, {
      texture: Material.Texture.Avatar({
        userId: '0xsome'
      }),
      roughness: 0.3
    })

    expect(Material.get(entity)).toStrictEqual<PBMaterial>({
      material: {
        $case: 'pbr',
        pbr: {
          texture: {
            tex: {
              $case: 'avatarTexture',
              avatarTexture: {
                userId: '0xsome'
              }
            }
          },
          roughness: 0.3
        }
      }
    })
  })

  it('should test video texture helper cases', () => {
    const newEngine = Engine()
    const Material = components.Material(newEngine)
    const entity = newEngine.addEntity()

    expect(Material.getOrNull(entity)).toBeNull()

    VideoPlayer.create(entity, {
      playing: true,
      position: 0.0,
      src: 'someVideo.mp4'
    })

    Material.setBasicMaterial(entity, {
      texture: Material.Texture.Video({
        videoPlayerEntity: entity as number
      })
    })

    expect(Material.get(entity)).toStrictEqual<PBMaterial>({
      material: {
        $case: 'unlit',
        unlit: {
          texture: {
            tex: {
              $case: 'videoTexture',
              videoTexture: {
                videoPlayerEntity: entity as number
              }
            }
          }
        }
      }
    })
  })
})
