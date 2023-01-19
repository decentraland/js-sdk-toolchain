import { BorderRect } from '@dcl/ecs'
import { Color4 } from '@dcl/ecs/dist/components/generated/pb/decentraland/common/colors.gen'

/**
 * @public
 */
export type UiBackgroundProps = {
  color?: Color4 | undefined
  textureMode?: TextureMode
  textureSlices?: BorderRect | undefined
  uvs?: number[]
} & UiTextureUnion

/**
 * @public
 */
export type UiTextureUnion = UiAvatarTexture | UiTexture

/**
 * @public
 */
export type UiAvatarTexture = {
  avatarTexture?: {
    userId: string
    wrapMode?: TextureWrap
    filterMode?: TextureFilter
  }
}

/**
 * @public
 */
export type UiTexture = {
  texture?: {
    src: string
    wrapMode?: TextureWrap
    filterMode?: TextureFilter
  }
}

/**
 * @public
 */
export type TextureWrap = 'repeat' | 'clamp' | 'mirror' | 'mirror-once'
/**
 * @public
 */
export type TextureFilter = 'point' | 'bi-linear' | 'tri-linear'
/**
 * @public
  * NINE_SLICES - https://docs.unity3d.com/Manual/UIE-USS-SupportedProperties.html (Slicing section)
  * https://forum.unity.com/threads/how-does-slicing-in-ui-tookkit-works.1235863/
  * https://docs.unity3d.com/Manual/9SliceSprites.html
  * https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-slice

  * CENTER - CENTER enables the texture to be rendered centered in relation to the
  * element. If the element is smaller than the texture then the background
  * should use the element as stencil to cut off the out-of-bounds area

  * STRETCH - STRETCH enables the texture to cover all the area of the container,
  * adopting its aspect ratio.
 */
export type TextureMode = 'nine-slices' | 'center' | 'stretch'
