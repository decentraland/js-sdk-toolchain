import { PBUiBackground } from '@dcl/ecs'
import { UiBackgroundProps } from './types'
import { getTexture, getTextureMode } from './utils'

/**
 * @public
 */
/* @__PURE__ */
export function parseUiBackground(props: UiBackgroundProps | undefined): PBUiBackground | undefined {
  if (!props || !Object.keys(props).length) return undefined
  const texture = getTexture(props)
  return {
    ...props,
    ...getTextureMode(props.textureMode),
    uvs: props.uvs ?? [],
    texture
  }
}
