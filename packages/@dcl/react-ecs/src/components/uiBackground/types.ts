import { PBUiBackground, Texture, AvatarTexture } from '@dcl/ecs'

/**
 * @public
 */
export type UiBackgroundProps = Partial<Omit<PBUiBackground, 'texture'>> &
  UiTextureUnion

/**
 * @public
 */
export type UiTextureUnion = UiAvatarTexture | UiTexture

/**
 * @public
 */
export type UiAvatarTexture = {
  avatarTexture?: AvatarTexture
}

/**
 * @public
 */
export type UiTexture = {
  texture?: Texture
}
