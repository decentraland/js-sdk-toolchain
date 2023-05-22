import { BorderRect } from '@dcl/ecs'
import { Color4 } from '@dcl/ecs/dist/components/generated/pb/decentraland/common/colors.gen'

/**
 * @public
 * Background Component props
 * .i.e to define a background color or image
 */
export interface UiBackgroundProps {
  /** Background color. @defaultValue `{ r: 1, g: 1, b: 1, a: 1 }` */
  color?: Color4 | undefined
  textureMode?: TextureMode
  /** Texture slices represents the top | right | bottom | left sizes of the slices for the borders. Values are percentages of the texture. */
  textureSlices?: BorderRect | undefined
  /** when STRETCH is selected, the uvs are configurable */
  uvs?: number[]
  /** AvatarTexture for the background */
  avatarTexture?: UiAvatarTexture
  /** Texture for the background */
  texture?: UiTexture
}
/**
 * Avatar Texture
 * @public
 */
export interface UiAvatarTexture {
  userId: string
  wrapMode?: TextureWrapType
  filterMode?: TextureFilterType
}

/**
 * Texture
 * @public
 */
export type UiTexture = {
  src: string
  wrapMode?: TextureWrapType
  filterMode?: TextureFilterType
}

/**
 * @public
 */
export type TextureWrapType = 'repeat' | 'clamp' | 'mirror'
/**
 * @public
 */
export type TextureFilterType = 'point' | 'bi-linear' | 'tri-linear'
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
