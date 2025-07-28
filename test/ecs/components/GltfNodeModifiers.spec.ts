import {
  Engine,
  components,
  PBMaterial_PbrMaterial,
  PBMaterial,
  PBMaterial_UnlitMaterial,
  TextureWrapMode,
  TextureFilterMode,
  MaterialTransparencyMode
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

describe('Generated GltfNodeModifiers ProtoBuf', () => {
  it('should serialize/deserialize GltfNodeModifiers', () => {
    const newEngine = Engine()
    const component = components.GltfNodeModifiers(newEngine)

    testComponentSerialization(component, {
      modifiers: [
        {
          path: 'test/path',
          castShadows: false,
          material: createPbrMaterial({
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
        },
        {
          path: 'test/path',
          castShadows: false,
          material: createUnlitMaterial({
            castShadows: true,
            diffuseColor: { r: 0, g: 1, b: 1, a: 1 },
            alphaTexture: undefined,
            alphaTest: undefined,
            texture: undefined
          })
        }
      ]
    })
  })
})
