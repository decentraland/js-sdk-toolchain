import {
  FilterMode,
  TextureWrapMode,
  TransparencyMode
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
        wrapMode: TextureWrapMode.UNRECOGNIZED,
        filterMode: undefined,
        src: 'not-casla'
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
      transparencyMode: TransparencyMode.TM_ALPHA_BLEND
    })

    Material.create(entityB, {
      albedoColor: { r: 0, g: 1, b: 1 },
      alphaTest: 1,
      alphaTexture: {
        wrapMode: TextureWrapMode.TWM_CLAMP,
        filterMode: FilterMode.FM_BILINEAR,
        src: 'not-casla'
      },
      bumpTexture: {
        wrapMode: TextureWrapMode.TWM_MIRROR,
        filterMode: FilterMode.FM_POINT,
        src: 'not-casla'
      },
      emissiveTexture: {
        wrapMode: TextureWrapMode.TWM_MIRROR_ONCE,
        filterMode: FilterMode.FM_TRILINEAR,
        src: 'not-casla'
      },
      texture: {
        wrapMode: TextureWrapMode.TWM_REPEAT,
        filterMode: FilterMode.UNRECOGNIZED,
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
      transparencyMode: TransparencyMode.TM_ALPHA_BLEND
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
