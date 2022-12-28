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
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    const entityC = newEngine.addEntity()
    const entityD = newEngine.addEntity()

    const _material = Material.create(
      entity,
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
        transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
        bumpTexture: undefined,
        emissiveTexture: undefined
      })
    )

    Material.create(
      entityB,
      createPbrMaterial({
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
    )

    const materialC = Material.create(
      entityC,
      createUnlitMaterial({
        castShadows: true,
        alphaTest: 1,
        texture: {
          tex: {
            $case: 'texture',
            texture: {
              wrapMode: TextureWrapMode.TWM_MIRROR_ONCE,
              filterMode: TextureFilterMode.TFM_TRILINEAR,
              src: 'not-casla'
            }
          }
        }
      })
    )

    Material.create(
      entityD,
      createUnlitMaterial({
        castShadows: true
      })
    )

    const buffer = Material.toBinary(entity)
    Material.updateFromBinary(entityB, buffer)

    const m = Material.getMutable(entityB)
    expect(_material).toEqual(m)

    expect(Material.createOrReplace(entityB)).not.toEqual({
      ...Material.getMutable(entity)
    })

    const bufferC = Material.toBinary(entityC)
    Material.updateFromBinary(entityD, bufferC)

    const mD = Material.getMutable(entityD)
    expect(materialC).toEqual(mD)
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
