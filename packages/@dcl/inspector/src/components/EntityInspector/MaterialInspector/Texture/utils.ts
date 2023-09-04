import { TextureUnion, TextureFilterMode, TextureWrapMode } from '@dcl/ecs'
import { Texture, TextureInput } from './types'

const toNumber = (value?: string, def?: number) => {
  const num = Number(value)
  return isNaN(num) ? def : num
}

const toString = (value: unknown, def: string = '') => (value ?? def).toString()

export const fromTexture = (value: TextureUnion): TextureInput => {
  switch (value.tex?.$case) {
    case 'avatarTexture':
      return {
        type: Texture.TT_AVATAR_TEXTURE,
        userId: toString(value.tex.avatarTexture.userId),
        wrapMode: toString(value.tex.avatarTexture.wrapMode),
        filterMode: toString(value.tex.avatarTexture.filterMode)
      }
    case 'videoTexture':
      return {
        type: Texture.TT_VIDEO_TEXTURE,
        videoPlayerEntity: toString(value.tex.videoTexture.videoPlayerEntity),
        wrapMode: toString(value.tex.videoTexture.wrapMode),
        filterMode: toString(value.tex.videoTexture.filterMode)
      }
    case 'texture':
    default:
      return {
        type: Texture.TT_TEXTURE,
        src: toString(value?.tex?.texture.src),
        wrapMode: toString(value?.tex?.texture.wrapMode),
        filterMode: toString(value?.tex?.texture.filterMode)
      }
  }
}

export const toTexture = (value?: TextureInput): TextureUnion => {
  switch (value?.type) {
    case Texture.TT_AVATAR_TEXTURE:
      return {
        tex: {
          $case: 'avatarTexture',
          avatarTexture: {
            userId: toString(value.userId),
            wrapMode: toNumber(value.wrapMode, TextureWrapMode.TWM_REPEAT),
            filterMode: toNumber(value.filterMode, TextureFilterMode.TFM_POINT)
          }
        }
      }
    case Texture.TT_VIDEO_TEXTURE:
      return {
        tex: {
          $case: 'videoTexture',
          videoTexture: {
            videoPlayerEntity: toNumber(value.videoPlayerEntity)!,
            wrapMode: toNumber(value.wrapMode, TextureWrapMode.TWM_REPEAT),
            filterMode: toNumber(value.filterMode, TextureFilterMode.TFM_POINT)
          }
        }
      }
    default:
      return {
        tex: {
          $case: 'texture',
          texture: {
            src: toString(value?.src),
            wrapMode: toNumber(value?.wrapMode, TextureWrapMode.TWM_REPEAT),
            filterMode: toNumber(value?.filterMode, TextureFilterMode.TFM_POINT)
          }
        }
      }
  }
}

export function isValidInput(): boolean {
  return true
}
