import {
  TextureFilterMode,
  TextureWrapMode,
  MaterialTransparencyMode
} from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/material.gen'
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
        wrapMode: TextureWrapMode.TWM_CLAMP,
        filterMode: undefined,
        src: 'not-casla'
      },
      alphaTexture: {
        filterMode: undefined,
        src: 'not-casla',
        wrapMode: undefined
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
        wrapMode: TextureWrapMode.TWM_CLAMP,
        filterMode: TextureFilterMode.TFM_BILINEAR,
        src: 'not-casla'
      },
      bumpTexture: {
        wrapMode: TextureWrapMode.TWM_MIRROR,
        filterMode: TextureFilterMode.TFM_POINT,
        src: 'not-casla'
      },
      emissiveTexture: {
        wrapMode: TextureWrapMode.TWM_MIRROR_ONCE,
        filterMode: TextureFilterMode.TFM_TRILINEAR,
        src: 'not-casla'
      },
      texture: {
        wrapMode: TextureWrapMode.TWM_REPEAT,
        src: 'not-casla'
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
