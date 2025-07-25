import {
  TextureUnion,
  TextureFilterMode,
  TextureWrapMode,
  AvatarTexture,
  VideoTexture,
  Texture as EcsTexture
} from '@dcl/ecs'
import { fromTexture, toTexture, isTexture, isModel, isValidTexture } from './utils'
import { Texture, TextureInput } from './types'

describe('fromTexture', () => {
  it('should convert from avatarTexture', () => {
    const base = 'base-path'
    const value: TextureUnion = {
      tex: {
        $case: 'avatarTexture',
        avatarTexture: {
          userId: 'user123',
          wrapMode: TextureWrapMode.TWM_CLAMP,
          filterMode: TextureFilterMode.TFM_BILINEAR
        }
      }
    }

    const result = fromTexture(base, value)

    expect(result.type).toBe(Texture.TT_AVATAR_TEXTURE)
    expect(result.userId).toBe('user123')
    expect(result.wrapMode).toBe(String(TextureWrapMode.TWM_CLAMP))
    expect(result.filterMode).toBe(String(TextureFilterMode.TFM_BILINEAR))
  })

  it('should convert from videoTexture', () => {
    const base = 'base-path'
    const value: TextureUnion = {
      tex: {
        $case: 'videoTexture',
        videoTexture: {
          videoPlayerEntity: 123,
          wrapMode: TextureWrapMode.TWM_REPEAT,
          filterMode: TextureFilterMode.TFM_TRILINEAR
        }
      }
    }

    const result = fromTexture(base, value)

    expect(result.type).toBe(Texture.TT_VIDEO_TEXTURE)
    expect(result.videoPlayerEntity).toBe('123')
    expect(result.wrapMode).toBe(String(TextureWrapMode.TWM_REPEAT))
    expect(result.filterMode).toBe(String(TextureFilterMode.TFM_TRILINEAR))
  })

  it('should convert from texture with a base path', () => {
    const base = 'base-path'
    const value: TextureUnion = {
      tex: {
        $case: 'texture',
        texture: {
          src: 'image.png',
          wrapMode: TextureWrapMode.TWM_REPEAT,
          filterMode: TextureFilterMode.TFM_TRILINEAR,
          offset: { x: 0.5, y: 0.25 },
          tiling: { x: 2.0, y: 1.5 }
        }
      }
    }

    const result = fromTexture(base, value)

    expect(result.type).toBe(Texture.TT_TEXTURE)
    expect(result.src).toBe('image.png')
    expect(result.wrapMode).toBe(String(TextureWrapMode.TWM_REPEAT))
    expect(result.filterMode).toBe(String(TextureFilterMode.TFM_TRILINEAR))
    expect(result.offset).toEqual({ x: '0.50', y: '0.25' })
    expect(result.tiling).toEqual({ x: '2.00', y: '1.50' })
  })

  it('should convert from texture without a base path', () => {
    const base = ''
    const value: TextureUnion = {
      tex: {
        $case: 'texture',
        texture: {
          src: 'image.png',
          wrapMode: TextureWrapMode.TWM_REPEAT,
          filterMode: TextureFilterMode.TFM_TRILINEAR,
          offset: { x: 0, y: 0 },
          tiling: { x: 1, y: 1 }
        }
      }
    }

    const result = fromTexture(base, value)

    expect(result.type).toBe(Texture.TT_TEXTURE)
    expect(result.src).toBe('image.png')
    expect(result.wrapMode).toBe(String(TextureWrapMode.TWM_REPEAT))
    expect(result.filterMode).toBe(String(TextureFilterMode.TFM_TRILINEAR))
    expect(result.offset).toEqual({ x: '0.00', y: '0.00' })
    expect(result.tiling).toEqual({ x: '1.00', y: '1.00' })
  })

  it('should convert from texture with default offset and tiling when not provided', () => {
    const base = 'base-path'
    const value: TextureUnion = {
      tex: {
        $case: 'texture',
        texture: {
          src: 'image.png',
          wrapMode: TextureWrapMode.TWM_REPEAT,
          filterMode: TextureFilterMode.TFM_TRILINEAR
        }
      }
    }

    const result = fromTexture(base, value)

    expect(result.type).toBe(Texture.TT_TEXTURE)
    expect(result.src).toBe('image.png')
    expect(result.wrapMode).toBe(String(TextureWrapMode.TWM_REPEAT))
    expect(result.filterMode).toBe(String(TextureFilterMode.TFM_TRILINEAR))
    expect(result.offset).toEqual({ x: '0', y: '0' })
    expect(result.tiling).toEqual({ x: '1', y: '1' })
  })

  it('should convert from texture with different offset and tiling values', () => {
    const base = 'base-path'
    const value: TextureUnion = {
      tex: {
        $case: 'texture',
        texture: {
          src: 'image.png',
          wrapMode: TextureWrapMode.TWM_REPEAT,
          filterMode: TextureFilterMode.TFM_TRILINEAR,
          offset: { x: 0.1, y: 0.3 },
          tiling: { x: 2.5, y: 3.0 }
        }
      }
    }

    const result = fromTexture(base, value)

    expect(result.type).toBe(Texture.TT_TEXTURE)
    expect(result.src).toBe('image.png')
    expect(result.wrapMode).toBe(String(TextureWrapMode.TWM_REPEAT))
    expect(result.filterMode).toBe(String(TextureFilterMode.TFM_TRILINEAR))
    expect(result.offset).toEqual({ x: '0.10', y: '0.30' })
    expect(result.tiling).toEqual({ x: '2.50', y: '3.00' })
  })
})

describe('toTexture', () => {
  it('should convert to avatarTexture', () => {
    const base = 'base-path'
    const value: TextureInput = {
      type: Texture.TT_AVATAR_TEXTURE,
      userId: 'user123',
      wrapMode: String(TextureWrapMode.TWM_CLAMP),
      filterMode: String(TextureFilterMode.TFM_BILINEAR)
    }

    const result = toTexture(base, value) as { tex: { $case: 'avatarTexture'; avatarTexture: AvatarTexture } }

    expect(result.tex.$case).toBe('avatarTexture')
    expect(result.tex.avatarTexture.userId).toBe('user123')
    expect(result.tex.avatarTexture.wrapMode).toBe(TextureWrapMode.TWM_CLAMP)
    expect(result.tex.avatarTexture.filterMode).toBe(TextureFilterMode.TFM_BILINEAR)
  })

  it('should convert to videoTexture', () => {
    const base = 'base-path'
    const value: TextureInput = {
      type: Texture.TT_VIDEO_TEXTURE,
      videoPlayerEntity: '123',
      wrapMode: String(TextureWrapMode.TWM_REPEAT),
      filterMode: String(TextureFilterMode.TFM_POINT)
    }

    const result = toTexture(base, value) as { tex: { $case: 'videoTexture'; videoTexture: VideoTexture } }

    expect(result.tex.$case).toBe('videoTexture')
    expect(result.tex.videoTexture.videoPlayerEntity).toBe(123)
    expect(result.tex.videoTexture.wrapMode).toBe(TextureWrapMode.TWM_REPEAT)
    expect(result.tex.videoTexture.filterMode).toBe(TextureFilterMode.TFM_POINT)
  })

  it('should convert to texture with offset and tiling', () => {
    const base = 'base-path'
    const value: TextureInput = {
      type: Texture.TT_TEXTURE,
      src: 'image.png',
      wrapMode: String(TextureWrapMode.TWM_REPEAT),
      filterMode: String(TextureFilterMode.TFM_POINT),
      offset: { x: '0.5', y: '0.25' },
      tiling: { x: '2.0', y: '1.5' }
    }

    const result = toTexture(base, value) as { tex: { $case: 'texture'; texture: EcsTexture } }

    expect(result.tex.$case).toBe('texture')
    expect(result.tex.texture.src).toBe('base-path/image.png')
    expect(result.tex.texture.wrapMode).toBe(TextureWrapMode.TWM_REPEAT)
    expect(result.tex.texture.filterMode).toBe(TextureFilterMode.TFM_POINT)
    expect(result.tex.texture.offset).toEqual({ x: 0.5, y: 0.25 })
    expect(result.tex.texture.tiling).toEqual({ x: 2.0, y: 1.5 })
  })

  it('should convert to texture with default offset and tiling when not provided', () => {
    const base = 'base-path'
    const value: TextureInput = {
      type: Texture.TT_TEXTURE,
      src: 'image.png',
      wrapMode: String(TextureWrapMode.TWM_REPEAT),
      filterMode: String(TextureFilterMode.TFM_POINT)
    }

    const result = toTexture(base, value) as { tex: { $case: 'texture'; texture: EcsTexture } }

    expect(result.tex.$case).toBe('texture')
    expect(result.tex.texture.src).toBe('base-path/image.png')
    expect(result.tex.texture.wrapMode).toBe(TextureWrapMode.TWM_REPEAT)
    expect(result.tex.texture.filterMode).toBe(TextureFilterMode.TFM_POINT)
    expect(result.tex.texture.offset).toEqual({ x: 0, y: 0 })
    expect(result.tex.texture.tiling).toEqual({ x: 1, y: 1 })
  })

  it('should convert to texture with different offset and tiling values', () => {
    const base = 'base-path'
    const value: TextureInput = {
      type: Texture.TT_TEXTURE,
      src: 'image.png',
      wrapMode: String(TextureWrapMode.TWM_REPEAT),
      filterMode: String(TextureFilterMode.TFM_POINT),
      offset: { x: '0.1', y: '0.3' },
      tiling: { x: '2.5', y: '3.0' }
    }

    const result = toTexture(base, value) as { tex: { $case: 'texture'; texture: EcsTexture } }

    expect(result.tex.$case).toBe('texture')
    expect(result.tex.texture.src).toBe('base-path/image.png')
    expect(result.tex.texture.wrapMode).toBe(TextureWrapMode.TWM_REPEAT)
    expect(result.tex.texture.filterMode).toBe(TextureFilterMode.TFM_POINT)
    expect(result.tex.texture.offset).toEqual({ x: 0.1, y: 0.3 })
    expect(result.tex.texture.tiling).toEqual({ x: 2.5, y: 3.0 })
  })
})

describe('isTexture', () => {
  it('should return true for a valid texture', () => {
    const value = 'image.png'
    const result = isTexture(value)
    expect(result).toBe(true)
  })

  it('should return false for a non-texture value', () => {
    const value = 'model.gltf'
    const result = isTexture(value)
    expect(result).toBe(false)
  })
})

describe('isModel', () => {
  it('should return true for a valid model node', () => {
    const node: any = {
      name: 'image.png',
      type: 'asset'
    }
    const result = isModel(node)
    expect(result).toBe(true)
  })

  it('should return false for a non-model node', () => {
    const node: any = {
      name: 'model.gltf',
      type: 'asset'
    }
    const result = isModel(node)
    expect(result).toBe(false)
  })
})

describe('isValidTexture', () => {
  it('should return true for a valid texture value', () => {
    const value = 'image.png'
    const assets = [{ path: 'image.png' }, { path: 'model.gltf' }]
    const result = isValidTexture(value, { basePath: '', assets })
    expect(result).toBe(true)
  })

  it('should return false for an invalid texture value', () => {
    const value = 'invalid.png'
    const assets = [{ path: 'image.png' }, { path: 'model.gltf' }]
    const result = isValidTexture(value, { basePath: '', assets })
    expect(result).toBe(false)
  })

  it('should return false when files are undefined', () => {
    const value = 'image.png'
    const files = undefined
    const result = isValidTexture(value, files)
    expect(result).toBe(false)
  })
})
