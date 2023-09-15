import { TextureUnion, TextureFilterMode, TextureWrapMode } from '@dcl/ecs'

import { toNumber, toString } from '../../utils'
import { Texture, TextureInput } from './types'
import { TreeNode } from '../../../ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../../ProjectAssetExplorer/types'
import { isAssetNode } from '../../../ProjectAssetExplorer/utils'
import { AssetCatalogResponse } from '../../../../lib/data-layer/remote-data-layer'
import { isValidInput } from '../../GltfInspector/utils'
import { removeBasePath } from '../../../../lib/logic/remove-base-path'

export const fromTexture = (base: string, value: TextureUnion): TextureInput => {
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
        src: toString(removeBasePath(base, value?.tex?.texture.src ?? '')),
        wrapMode: toString(value?.tex?.texture.wrapMode),
        filterMode: toString(value?.tex?.texture.filterMode)
      }
  }
}

export const toTexture = (base: string, value?: TextureInput): TextureUnion => {
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
            videoPlayerEntity: toNumber(value.videoPlayerEntity ?? '')!,
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
            src: value?.src ? toString(base ? base + '/' + value.src : value.src) : '',
            wrapMode: toNumber(value?.wrapMode ?? '0', TextureWrapMode.TWM_REPEAT),
            filterMode: toNumber(value?.filterMode ?? '0', TextureFilterMode.TFM_POINT)
          }
        }
      }
  }
}

export const isTexture = (value: string): boolean => value.endsWith('.png')
export const isModel = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isTexture(node.name)

export function isValidTexture(value: any, files?: AssetCatalogResponse): boolean {
  if (typeof value === 'string' && files) return isValidInput(files, value)
  return false
}
