import { TextureFilterMode, TextureWrapMode } from '@dcl/ecs'

import { mapSelectFieldOptions } from '../../../ui/Dropdown/utils'
import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import { TextureType } from '../types'
import { AssetCatalogResponse } from '../../../../lib/data-layer/remote-data-layer'

export type Props = {
  label: string
  texture: TextureType
  files?: AssetCatalogResponse
  getInputProps: ReturnType<typeof useComponentInput>['getInputProps']
}

export enum Texture {
  TT_TEXTURE = 'texture',
  TT_AVATAR_TEXTURE = 'avatarTexture',
  TT_VIDEO_TEXTURE = 'videoTexture'
}

export type TextureInput = {
  type: Texture
  src?: string
  userId?: string
  videoPlayerEntity?: string
  wrapMode: string
  filterMode: string
}

export const WRAP_MODES = [
  {
    value: TextureWrapMode.TWM_REPEAT,
    label: 'Repeat'
  },
  {
    value: TextureWrapMode.TWM_CLAMP,
    label: 'Clamp'
  },
  {
    value: TextureWrapMode.TWM_MIRROR,
    label: 'Mirror'
  }
]

export const FILTER_MODES = [
  {
    value: TextureFilterMode.TFM_POINT,
    label: 'Point'
  },
  {
    value: TextureFilterMode.TFM_BILINEAR,
    label: 'Bilinear'
  },
  {
    value: TextureFilterMode.TFM_TRILINEAR,
    label: 'Trilinear'
  }
]

export const TEXTURE_TYPES = mapSelectFieldOptions({
  TT_TEXTURE: 'texture',
  TT_VIDEO_TEXTURE: 'videoTexture'
})
