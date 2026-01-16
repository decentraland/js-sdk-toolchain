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
        alphaTexture: undefined,
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
        alphaTexture: undefined,
        bumpTexture: {
          tex: {
            $case: 'texture',
            texture: {
              wrapMode: TextureWrapMode.TWM_MIRROR,
              filterMode: TextureFilterMode.TFM_POINT,
              src: 'not-casla',
              tiling: undefined,
              offset: undefined
            }
          }
        },
        emissiveTexture: {
          tex: {
            $case: 'texture',
            texture: {
              wrapMode: TextureWrapMode.TWM_MIRROR,
              filterMode: TextureFilterMode.TFM_TRILINEAR,
              src: 'not-casla',
              tiling: undefined,
              offset: undefined
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
        alphaTexture: undefined,
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
      src: 'someVideo.mp4',
      spatial: false,
      spatialMinDistance: 5,
      spatialMaxDistance: 40
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

  describe('getFlat() API', () => {
    it('should read texture src from PBR material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'myTexture.png',
          wrapMode: TextureWrapMode.TWM_CLAMP,
          filterMode: TextureFilterMode.TFM_BILINEAR
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.texture.src).toBe('myTexture.png')
      expect(flat.texture.wrapMode).toBe(TextureWrapMode.TWM_CLAMP)
      expect(flat.texture.filterMode).toBe(TextureFilterMode.TFM_BILINEAR)
    })

    it('should read texture src from Unlit material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'unlitTexture.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.texture.src).toBe('unlitTexture.png')
    })

    it('should set texture src on existing PBR material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'original.png'
        }),
        metallic: 0.5
      })

      Material.getFlat(entity).texture.src = 'updated.png'

      const mat = Material.get(entity)
      expect(mat.material?.$case).toBe('pbr')
      if (mat.material?.$case === 'pbr') {
        expect(mat.material.pbr.texture?.tex?.$case).toBe('texture')
        if (mat.material.pbr.texture?.tex?.$case === 'texture') {
          expect(mat.material.pbr.texture.tex.texture.src).toBe('updated.png')
        }
        // Other properties should remain unchanged
        expect(mat.material.pbr.metallic).toBe(0.5)
      }
    })

    it('should set texture src on existing Unlit material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'original.png'
        }),
        diffuseColor: { r: 1, g: 0, b: 0, a: 1 }
      })

      Material.getFlat(entity).texture.src = 'updated.png'

      const mat = Material.get(entity)
      expect(mat.material?.$case).toBe('unlit')
      if (mat.material?.$case === 'unlit') {
        expect(mat.material.unlit.texture?.tex?.$case).toBe('texture')
        if (mat.material.unlit.texture?.tex?.$case === 'texture') {
          expect(mat.material.unlit.texture.tex.texture.src).toBe('updated.png')
        }
        // Other properties should remain unchanged
        expect(mat.material.unlit.diffuseColor).toEqual({ r: 1, g: 0, b: 0, a: 1 })
      }
    })

    it('should create texture structure when setting src on material without texture', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      // Create PBR material without texture
      Material.setPbrMaterial(entity, {
        metallic: 0.8
      })

      // Set texture src - should create the nested structure
      Material.getFlat(entity).texture.src = 'newTexture.png'

      const mat = Material.get(entity)
      expect(mat.material?.$case).toBe('pbr')
      if (mat.material?.$case === 'pbr') {
        expect(mat.material.pbr.texture?.tex?.$case).toBe('texture')
        if (mat.material.pbr.texture?.tex?.$case === 'texture') {
          expect(mat.material.pbr.texture.tex.texture.src).toBe('newTexture.png')
        }
      }
    })

    it('should return undefined when reading texture that does not exist', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      // Create PBR material without texture
      Material.setPbrMaterial(entity, {
        metallic: 0.8
      })

      const flat = Material.getFlat(entity)
      expect(flat.texture.src).toBeUndefined()
      expect(flat.texture.wrapMode).toBeUndefined()
      expect(flat.texture.filterMode).toBeUndefined()
    })

    it('should return undefined when texture is avatar type (not regular texture)', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Avatar({
          userId: '0xabc'
        })
      })

      const flat = Material.getFlat(entity)
      // Avatar textures don't have src, so it should return undefined
      expect(flat.texture.src).toBeUndefined()
    })

    it('should throw when setting src on avatar texture', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Avatar({
          userId: '0xabc'
        })
      })

      expect(() => {
        Material.getFlat(entity).texture.src = 'newTexture.png'
      }).toThrow('Cannot set texture properties on Avatar texture')
    })

    it('should throw when setting src on video texture', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Video({
          videoPlayerEntity: 123
        })
      })

      expect(() => {
        Material.getFlat(entity).texture.src = 'newTexture.png'
      }).toThrow('Cannot set texture properties on Video texture')
    })

    it('should throw when setting wrapMode on avatar texture', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Avatar({
          userId: '0xabc'
        })
      })

      expect(() => {
        Material.getFlat(entity).texture.wrapMode = TextureWrapMode.TWM_MIRROR
      }).toThrow('Cannot set texture properties on Avatar texture')
    })

    it('should throw when setting filterMode on video texture', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Video({
          videoPlayerEntity: 123
        })
      })

      expect(() => {
        Material.getFlat(entity).texture.filterMode = TextureFilterMode.TFM_TRILINEAR
      }).toThrow('Cannot set texture properties on Video texture')
    })

    it('should throw when entity does not have Material component', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      expect(() => Material.getFlat(entity)).toThrow()
    })

    it('should set wrapMode and filterMode', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'test.png'
        })
      })

      const flat = Material.getFlat(entity)
      flat.texture.wrapMode = TextureWrapMode.TWM_MIRROR
      flat.texture.filterMode = TextureFilterMode.TFM_TRILINEAR

      const mat = Material.get(entity)
      if (mat.material?.$case === 'pbr' && mat.material.pbr.texture?.tex?.$case === 'texture') {
        expect(mat.material.pbr.texture.tex.texture.wrapMode).toBe(TextureWrapMode.TWM_MIRROR)
        expect(mat.material.pbr.texture.tex.texture.filterMode).toBe(TextureFilterMode.TFM_TRILINEAR)
      }
    })

    // alphaTexture tests
    it('should read/write alphaTexture on PBR material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        alphaTexture: Material.Texture.Common({
          src: 'alpha.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.alphaTexture.src).toBe('alpha.png')

      flat.alphaTexture.src = 'newAlpha.png'
      expect(flat.alphaTexture.src).toBe('newAlpha.png')
    })

    it('should read/write alphaTexture on Unlit material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setBasicMaterial(entity, {
        alphaTexture: Material.Texture.Common({
          src: 'alpha.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.alphaTexture.src).toBe('alpha.png')

      flat.alphaTexture.src = 'newAlpha.png'
      expect(flat.alphaTexture.src).toBe('newAlpha.png')
    })

    // emissiveTexture tests (PBR only)
    it('should read/write emissiveTexture on PBR material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        emissiveTexture: Material.Texture.Common({
          src: 'glow.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.emissiveTexture.src).toBe('glow.png')

      flat.emissiveTexture.src = 'newGlow.png'
      expect(flat.emissiveTexture.src).toBe('newGlow.png')
    })

    it('should return undefined when reading emissiveTexture on Unlit material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'diffuse.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.emissiveTexture.src).toBeUndefined()
      expect(flat.emissiveTexture.wrapMode).toBeUndefined()
      expect(flat.emissiveTexture.filterMode).toBeUndefined()
    })

    it('should throw when writing emissiveTexture on Unlit material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'diffuse.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(() => {
        flat.emissiveTexture.src = 'glow.png'
      }).toThrow('Cannot set emissiveTexture on Unlit material')
    })

    // bumpTexture tests (PBR only)
    it('should read/write bumpTexture on PBR material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        bumpTexture: Material.Texture.Common({
          src: 'normal.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.bumpTexture.src).toBe('normal.png')

      flat.bumpTexture.src = 'newNormal.png'
      expect(flat.bumpTexture.src).toBe('newNormal.png')
    })

    it('should return undefined when reading bumpTexture on Unlit material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'diffuse.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(flat.bumpTexture.src).toBeUndefined()
      expect(flat.bumpTexture.wrapMode).toBeUndefined()
      expect(flat.bumpTexture.filterMode).toBeUndefined()
    })

    it('should throw when writing bumpTexture on Unlit material', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({
          src: 'diffuse.png'
        })
      })

      const flat = Material.getFlat(entity)
      expect(() => {
        flat.bumpTexture.src = 'normal.png'
      }).toThrow('Cannot set bumpTexture on Unlit material')
    })

    it('should create emissiveTexture structure when setting on PBR material without it', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        metallic: 0.5
      })

      Material.getFlat(entity).emissiveTexture.src = 'glow.png'

      const mat = Material.get(entity)
      if (mat.material?.$case === 'pbr') {
        expect(mat.material.pbr.emissiveTexture?.tex?.$case).toBe('texture')
        if (mat.material.pbr.emissiveTexture?.tex?.$case === 'texture') {
          expect(mat.material.pbr.emissiveTexture.tex.texture.src).toBe('glow.png')
        }
      }
    })

    it('should create bumpTexture structure when setting on PBR material without it', () => {
      const newEngine = Engine()
      const Material = components.Material(newEngine)
      const entity = newEngine.addEntity()

      Material.setPbrMaterial(entity, {
        metallic: 0.5
      })

      Material.getFlat(entity).bumpTexture.src = 'normal.png'

      const mat = Material.get(entity)
      if (mat.material?.$case === 'pbr') {
        expect(mat.material.pbr.bumpTexture?.tex?.$case).toBe('texture')
        if (mat.material.pbr.bumpTexture?.tex?.$case === 'texture') {
          expect(mat.material.pbr.bumpTexture.tex.texture.src).toBe('normal.png')
        }
      }
    })

    // ======== Non-texture property tests ========

    // Shared properties tests (alphaTest, castShadows)
    describe('shared properties', () => {
      it('should read/write alphaTest on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          alphaTest: 0.3
        })

        const flat = Material.getFlat(entity)
        expect(flat.alphaTest).toBe(0.3)

        flat.alphaTest = 0.7
        expect(flat.alphaTest).toBe(0.7)

        const mat = Material.get(entity)
        if (mat.material?.$case === 'pbr') {
          expect(mat.material.pbr.alphaTest).toBe(0.7)
        }
      })

      it('should read/write alphaTest on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {
          alphaTest: 0.4
        })

        const flat = Material.getFlat(entity)
        expect(flat.alphaTest).toBe(0.4)

        flat.alphaTest = 0.9
        expect(flat.alphaTest).toBe(0.9)

        const mat = Material.get(entity)
        if (mat.material?.$case === 'unlit') {
          expect(mat.material.unlit.alphaTest).toBe(0.9)
        }
      })

      it('should read/write castShadows on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          castShadows: true
        })

        const flat = Material.getFlat(entity)
        expect(flat.castShadows).toBe(true)

        flat.castShadows = false
        expect(flat.castShadows).toBe(false)

        const mat = Material.get(entity)
        if (mat.material?.$case === 'pbr') {
          expect(mat.material.pbr.castShadows).toBe(false)
        }
      })

      it('should read/write castShadows on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {
          castShadows: false
        })

        const flat = Material.getFlat(entity)
        expect(flat.castShadows).toBe(false)

        flat.castShadows = true
        expect(flat.castShadows).toBe(true)

        const mat = Material.get(entity)
        if (mat.material?.$case === 'unlit') {
          expect(mat.material.unlit.castShadows).toBe(true)
        }
      })

      it('should return undefined when alphaTest is not set', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          metallic: 0.5
        })

        const flat = Material.getFlat(entity)
        expect(flat.alphaTest).toBeUndefined()
      })
    })

    // PBR-only properties tests
    describe('PBR-only properties', () => {
      it('should read/write metallic on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          metallic: 0.5
        })

        const flat = Material.getFlat(entity)
        expect(flat.metallic).toBe(0.5)

        flat.metallic = 0.9
        expect(flat.metallic).toBe(0.9)
      })

      it('should read/write roughness on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          roughness: 0.3
        })

        const flat = Material.getFlat(entity)
        expect(flat.roughness).toBe(0.3)

        flat.roughness = 0.8
        expect(flat.roughness).toBe(0.8)
      })

      it('should read/write albedoColor on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          albedoColor: { r: 1, g: 0, b: 0, a: 1 }
        })

        const flat = Material.getFlat(entity)
        expect(flat.albedoColor).toEqual({ r: 1, g: 0, b: 0, a: 1 })

        flat.albedoColor = { r: 0, g: 1, b: 0, a: 0.5 }
        expect(flat.albedoColor).toEqual({ r: 0, g: 1, b: 0, a: 0.5 })
      })

      it('should read/write emissiveColor on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          emissiveColor: { r: 1, g: 1, b: 0 }
        })

        const flat = Material.getFlat(entity)
        expect(flat.emissiveColor).toEqual({ r: 1, g: 1, b: 0 })

        flat.emissiveColor = { r: 0, g: 0, b: 1 }
        expect(flat.emissiveColor).toEqual({ r: 0, g: 0, b: 1 })
      })

      it('should read/write reflectivityColor on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          reflectivityColor: { r: 0.5, g: 0.5, b: 0.5 }
        })

        const flat = Material.getFlat(entity)
        expect(flat.reflectivityColor).toEqual({ r: 0.5, g: 0.5, b: 0.5 })

        flat.reflectivityColor = { r: 1, g: 1, b: 1 }
        expect(flat.reflectivityColor).toEqual({ r: 1, g: 1, b: 1 })
      })

      it('should read/write transparencyMode on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          transparencyMode: MaterialTransparencyMode.MTM_OPAQUE
        })

        const flat = Material.getFlat(entity)
        expect(flat.transparencyMode).toBe(MaterialTransparencyMode.MTM_OPAQUE)

        flat.transparencyMode = MaterialTransparencyMode.MTM_ALPHA_BLEND
        expect(flat.transparencyMode).toBe(MaterialTransparencyMode.MTM_ALPHA_BLEND)
      })

      it('should read/write specularIntensity on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          specularIntensity: 1.5
        })

        const flat = Material.getFlat(entity)
        expect(flat.specularIntensity).toBe(1.5)

        flat.specularIntensity = 2.0
        expect(flat.specularIntensity).toBe(2.0)
      })

      it('should read/write emissiveIntensity on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          emissiveIntensity: 3.0
        })

        const flat = Material.getFlat(entity)
        expect(flat.emissiveIntensity).toBe(3.0)

        flat.emissiveIntensity = 5.0
        expect(flat.emissiveIntensity).toBe(5.0)
      })

      it('should read/write directIntensity on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          directIntensity: 1.0
        })

        const flat = Material.getFlat(entity)
        expect(flat.directIntensity).toBe(1.0)

        flat.directIntensity = 2.0
        expect(flat.directIntensity).toBe(2.0)
      })

      it('should return undefined when reading PBR-only properties on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {
          diffuseColor: { r: 1, g: 1, b: 1, a: 1 }
        })

        const flat = Material.getFlat(entity)
        expect(flat.metallic).toBeUndefined()
        expect(flat.roughness).toBeUndefined()
        expect(flat.albedoColor).toBeUndefined()
        expect(flat.emissiveColor).toBeUndefined()
        expect(flat.reflectivityColor).toBeUndefined()
        expect(flat.transparencyMode).toBeUndefined()
        expect(flat.specularIntensity).toBeUndefined()
        expect(flat.emissiveIntensity).toBeUndefined()
        expect(flat.directIntensity).toBeUndefined()
      })

      it('should throw when writing metallic on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {})

        const flat = Material.getFlat(entity)
        expect(() => {
          flat.metallic = 0.5
        }).toThrow('Cannot set metallic on Unlit material')
      })

      it('should throw when writing roughness on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {})

        const flat = Material.getFlat(entity)
        expect(() => {
          flat.roughness = 0.5
        }).toThrow('Cannot set roughness on Unlit material')
      })

      it('should throw when writing albedoColor on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {})

        const flat = Material.getFlat(entity)
        expect(() => {
          flat.albedoColor = { r: 1, g: 0, b: 0, a: 1 }
        }).toThrow('Cannot set albedoColor on Unlit material')
      })

      it('should throw when writing transparencyMode on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {})

        const flat = Material.getFlat(entity)
        expect(() => {
          flat.transparencyMode = MaterialTransparencyMode.MTM_ALPHA_BLEND
        }).toThrow('Cannot set transparencyMode on Unlit material')
      })
    })

    // Unlit-only property tests (diffuseColor)
    describe('Unlit-only properties', () => {
      it('should read/write diffuseColor on Unlit material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setBasicMaterial(entity, {
          diffuseColor: { r: 1, g: 0, b: 0, a: 1 }
        })

        const flat = Material.getFlat(entity)
        expect(flat.diffuseColor).toEqual({ r: 1, g: 0, b: 0, a: 1 })

        flat.diffuseColor = { r: 0, g: 0, b: 1, a: 0.8 }
        expect(flat.diffuseColor).toEqual({ r: 0, g: 0, b: 1, a: 0.8 })

        const mat = Material.get(entity)
        if (mat.material?.$case === 'unlit') {
          expect(mat.material.unlit.diffuseColor).toEqual({ r: 0, g: 0, b: 1, a: 0.8 })
        }
      })

      it('should return undefined when reading diffuseColor on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          albedoColor: { r: 1, g: 1, b: 1, a: 1 }
        })

        const flat = Material.getFlat(entity)
        expect(flat.diffuseColor).toBeUndefined()
      })

      it('should throw when writing diffuseColor on PBR material', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {})

        const flat = Material.getFlat(entity)
        expect(() => {
          flat.diffuseColor = { r: 1, g: 0, b: 0, a: 1 }
        }).toThrow('Cannot set diffuseColor on PBR material')
      })
    })

    // Multiple properties at once
    describe('multiple properties', () => {
      it('should set multiple PBR properties in sequence', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {})

        const flat = Material.getFlat(entity)
        flat.metallic = 0.8
        flat.roughness = 0.2
        flat.alphaTest = 0.5
        flat.castShadows = false
        flat.albedoColor = { r: 1, g: 0.5, b: 0, a: 1 }
        flat.transparencyMode = MaterialTransparencyMode.MTM_ALPHA_TEST

        expect(flat.metallic).toBe(0.8)
        expect(flat.roughness).toBe(0.2)
        expect(flat.alphaTest).toBe(0.5)
        expect(flat.castShadows).toBe(false)
        expect(flat.albedoColor).toEqual({ r: 1, g: 0.5, b: 0, a: 1 })
        expect(flat.transparencyMode).toBe(MaterialTransparencyMode.MTM_ALPHA_TEST)
      })

      it('should set both texture and non-texture properties', () => {
        const newEngine = Engine()
        const Material = components.Material(newEngine)
        const entity = newEngine.addEntity()

        Material.setPbrMaterial(entity, {
          texture: Material.Texture.Common({ src: 'original.png' })
        })

        const flat = Material.getFlat(entity)
        flat.texture.src = 'updated.png'
        flat.metallic = 0.9
        flat.roughness = 0.1

        expect(flat.texture.src).toBe('updated.png')
        expect(flat.metallic).toBe(0.9)
        expect(flat.roughness).toBe(0.1)

        const mat = Material.get(entity)
        if (mat.material?.$case === 'pbr') {
          expect(mat.material.pbr.metallic).toBe(0.9)
          expect(mat.material.pbr.roughness).toBe(0.1)
          if (mat.material.pbr.texture?.tex?.$case === 'texture') {
            expect(mat.material.pbr.texture.tex.texture.src).toBe('updated.png')
          }
        }
      })
    })
  })
})
