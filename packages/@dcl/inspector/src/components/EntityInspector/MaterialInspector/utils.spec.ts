import { PBMaterial, PBMaterial_PbrMaterial, PBMaterial_UnlitMaterial } from '@dcl/ecs'
import { MaterialInput, MaterialType } from './types'
import { fromMaterial, toMaterial, isValidMaterial } from './utils'
import { Texture } from './Texture/types'
import { COLORS } from '../../ui/ColorField/utils'

describe('fromMaterial', () => {
  it('should convert from unlit material', () => {
    const base = 'base-path'
    const value: PBMaterial = {
      material: {
        $case: 'unlit' as const,
        unlit: {
          alphaTest: 0.75,
          castShadows: true,
          diffuseColor: { r: 1, b: 0, g: 0, a: 1 },
          texture: {
            tex: {
              $case: 'texture',
              texture: {
                src: 'some-src'
              }
            }
          }
        }
      }
    }

    const result = fromMaterial(base)(value)

    expect(result.type).toBe(MaterialType.MT_UNLIT)
    expect(result.alphaTest).toBe('0.75')
    expect(result.castShadows).toBe(true)
    expect(result.diffuseColor).toEqual('#FF0000')
    expect(result.texture).toEqual({ type: 'texture', src: 'some-src', wrapMode: '0', filterMode: '0' })
  })

  it('should convert from pbr material', () => {
    const base = 'base-path'
    const value: PBMaterial = {
      material: {
        $case: 'pbr' as const,
        pbr: {
          alphaTest: 0.6,
          castShadows: false,
          emissiveColor: { r: 1, b: 0, g: 0 },
          texture: {
            tex: {
              $case: 'texture',
              texture: {
                src: 'some-src'
              }
            }
          },
          bumpTexture: {
            tex: {
              $case: 'avatarTexture',
              avatarTexture: {
                userId: 'some-id',
                wrapMode: 2,
                filterMode: 2
              }
            }
          }
        }
      }
    }

    const result = fromMaterial(base)(value)

    expect(result.type).toBe(MaterialType.MT_PBR)
    expect(result.alphaTest).toBe('0.6')
    expect(result.castShadows).toBe(false)
    expect(result.texture).toEqual({ type: 'texture', src: 'some-src', wrapMode: '0', filterMode: '0' })
    expect(result.bumpTexture).toEqual({ type: 'avatarTexture', userId: 'some-id', wrapMode: '2', filterMode: '2' })
    expect(result.metallic).toBe('0.5')
    expect(result.specularIntensity).toBe('1')
    expect(result.albedoColor).toBe(COLORS[0].value)
    expect(result.emissiveColor).toEqual('#FF0000')
  })
})

describe('toMaterial', () => {
  it('should convert to unlit material', () => {
    const base = 'base-path'
    const value: MaterialInput = {
      type: MaterialType.MT_UNLIT,
      alphaTest: '0.75',
      castShadows: true,
      diffuseColor: '#FF0000',
      texture: {
        type: Texture.TT_TEXTURE,
        src: 'some-src',
        wrapMode: '1',
        filterMode: '1'
      }
    }

    const result = toMaterial(base)(value) as { material: { $case: 'unlit'; unlit: PBMaterial_UnlitMaterial } }

    expect(result.material.$case).toBe('unlit')
    expect(result.material.unlit.alphaTest).toBe(0.75)
    expect(result.material.unlit.castShadows).toBe(true)
    expect(result.material.unlit.diffuseColor).toStrictEqual({ r: 1, b: 0, g: 0, a: 1 })
    expect(result.material.unlit.texture).toStrictEqual({
      tex: {
        $case: 'texture',
        texture: {
          src: 'base-path/some-src',
          wrapMode: 1,
          filterMode: 1
        }
      }
    })
  })

  it('should convert to pbr material', () => {
    const base = 'base-path'
    const value: MaterialInput = {
      type: MaterialType.MT_PBR,
      alphaTest: '0.6',
      castShadows: false,
      emissiveColor: '#FF0000',
      texture: {
        type: Texture.TT_TEXTURE,
        src: 'some-src',
        wrapMode: '1',
        filterMode: '1'
      },
      bumpTexture: {
        type: Texture.TT_AVATAR_TEXTURE,
        userId: 'some-id',
        wrapMode: '2',
        filterMode: '2'
      }
    }

    const result = toMaterial(base)(value) as { material: { $case: 'pbr'; pbr: PBMaterial_PbrMaterial } }

    expect(result.material.$case).toBe('pbr')
    expect(result.material.pbr.alphaTest).toBe(0.6)
    expect(result.material.pbr.castShadows).toBe(false)
    expect(result.material.pbr.emissiveColor).toStrictEqual({ r: 1, b: 0, g: 0 })
    expect(result.material.pbr.texture).toStrictEqual({
      tex: {
        $case: 'texture',
        texture: {
          src: 'base-path/some-src',
          wrapMode: 1,
          filterMode: 1
        }
      }
    })
    expect(result.material.pbr.bumpTexture).toStrictEqual({
      tex: {
        $case: 'avatarTexture',
        avatarTexture: {
          userId: 'some-id',
          wrapMode: 2,
          filterMode: 2
        }
      }
    })
  })
})

describe('isValidMaterial', () => {
  it('should return true', () => {
    const result = isValidMaterial()
    expect(result).toBe(true)
  })
})
