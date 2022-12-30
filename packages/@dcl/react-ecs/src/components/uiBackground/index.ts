import { BackgroundTextureMode, PBUiBackground } from '@dcl/ecs'
import { UiBackgroundProps, UiTexture, UiAvatarTexture } from './types'

function isAvatarTexture(
  props: UiBackgroundProps
): props is UiBackgroundProps & UiAvatarTexture {
  return !!(props as UiAvatarTexture).avatarTexture
}

function isTexture(
  props: UiBackgroundProps
): props is UiBackgroundProps & UiTexture {
  return !!(props as UiTexture).texture
}

function getTexture(props: UiBackgroundProps): PBUiBackground['texture'] {
  if (isTexture(props) && props.texture) {
    return {
      tex: {
        $case: 'texture',
        texture: props.texture
      }
    }
  }

  if (isAvatarTexture(props) && props.avatarTexture) {
    return {
      tex: {
        $case: 'avatarTexture',
        avatarTexture: props.avatarTexture
      }
    }
  }
  return undefined
}

/**
 * @public
 */
/*#__PURE__*/
export function parseUiBackground(
  props: UiBackgroundProps | undefined
): PBUiBackground | undefined {
  if (!props || !Object.keys(props).length) return undefined
  const texture = getTexture(props)
  return {
    ...props,
    uvs: props.uvs ?? [],
    texture,
    textureMode: props.textureMode ?? BackgroundTextureMode.CENTER
  }
}
