import { TextureUnion, TextureFilterMode, TextureWrapMode } from '@dcl/ecs'

import { toNumber, toString } from '../../utils'
import { Texture, TextureInput } from './types'
import { TreeNode } from '../../../ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../../ProjectAssetExplorer/types'
import { isAssetNode } from '../../../ProjectAssetExplorer/utils'
import { AssetCatalogResponse } from '../../../../lib/data-layer/remote-data-layer'
import { isValidInput } from '../../GltfInspector/utils'
import { removeBasePath } from '../../../../lib/logic/remove-base-path'
import { isValidHttpsUrl } from '../../../../lib/utils/url'

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
      const src = value?.tex?.texture.src ?? ''
      return {
        type: Texture.TT_TEXTURE,
        src: isValidHttpsUrl(src) ? src : removeBasePath(base, src),
        wrapMode: toString(value?.tex?.texture.wrapMode),
        filterMode: toString(value?.tex?.texture.filterMode),
        offset: {
          x: value?.tex?.texture.offset?.x?.toFixed(2) ?? '0',
          y: value?.tex?.texture.offset?.y?.toFixed(2) ?? '0'
        },
        tiling: {
          x: value?.tex?.texture.tiling?.x?.toFixed(2) ?? '1',
          y: value?.tex?.texture.tiling?.y?.toFixed(2) ?? '1'
        }
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
      const src = value?.src || ''
      return {
        tex: {
          $case: 'texture',
          texture: {
            src: isValidHttpsUrl(src) ? src : (src && base ? base + '/' : '') + src,
            wrapMode: toNumber(value?.wrapMode ?? '0', TextureWrapMode.TWM_REPEAT),
            filterMode: toNumber(value?.filterMode ?? '0', TextureFilterMode.TFM_POINT),
            offset: {
              x: toNumber(value?.offset?.x ?? '0'),
              y: toNumber(value?.offset?.y ?? '0')
            },
            tiling: {
              x: toNumber(value?.tiling?.x ?? '1'),
              y: toNumber(value?.tiling?.y ?? '1')
            }
          }
        }
      }
  }
}

export const isTexture = (value: string): boolean =>
  value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.jpeg')
export const isModel = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isTexture(node.name)

export function isValidTexture(value: any, files?: AssetCatalogResponse): boolean {
  if (typeof value === 'string' && files) return isValidHttpsUrl(value) || isValidInput(files, value)
  return false
}
