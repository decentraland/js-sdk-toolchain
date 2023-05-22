import { BackgroundTextureMode, PBUiBackground, TextureFilterMode, TextureWrapMode } from '@dcl/ecs'
import { UiBackgroundProps, TextureWrapType, TextureFilterType, TextureMode } from './types'

const parseTextureMode: Readonly<Record<TextureMode, BackgroundTextureMode>> = {
  'nine-slices': BackgroundTextureMode.NINE_SLICES,
  center: BackgroundTextureMode.CENTER,
  stretch: BackgroundTextureMode.STRETCH
}
/**
 * @internal
 */
export function getTextureMode(mode: TextureMode | undefined): Record<'textureMode', BackgroundTextureMode> {
  const value: BackgroundTextureMode = mode ? parseTextureMode[mode] : BackgroundTextureMode.CENTER
  return { textureMode: value }
}

/**
 * @internal
 */
export function getTexture(props: UiBackgroundProps): PBUiBackground['texture'] {
  if (props.texture) {
    return {
      tex: {
        $case: 'texture',
        texture: parseTexture(props.texture)
      }
    }
  }

  if (props.avatarTexture) {
    return {
      tex: {
        $case: 'avatarTexture',
        avatarTexture: parseTexture(props.avatarTexture)
      }
    }
  }
  return undefined
}

type CommonTexture<T = unknown> = T & {
  wrapMode?: TextureWrapType
  filterMode?: TextureFilterType
}
type Texture<T = unknown> = T & {
  wrapMode?: TextureWrapMode | undefined
  filterMode?: TextureFilterMode | undefined
}

function parseTexture<T = unknown>(texture: CommonTexture<T>): Texture<T> {
  return {
    ...texture,
    wrapMode: texture.wrapMode ? parseWrap[texture.wrapMode] : undefined,
    filterMode: texture.filterMode ? parseFilter[texture.filterMode] : undefined
  }
}

const parseWrap: Readonly<Record<TextureWrapType, TextureWrapMode>> = {
  repeat: TextureWrapMode.TWM_REPEAT,
  clamp: TextureWrapMode.TWM_CLAMP,
  mirror: TextureWrapMode.TWM_MIRROR
}
const parseFilter: Readonly<Record<TextureFilterType, TextureFilterMode>> = {
  point: TextureFilterMode.TFM_POINT,
  'bi-linear': TextureFilterMode.TFM_BILINEAR,
  'tri-linear': TextureFilterMode.TFM_TRILINEAR
}
