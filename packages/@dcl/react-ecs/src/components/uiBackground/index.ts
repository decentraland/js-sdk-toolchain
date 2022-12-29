import { BackgroundTextureMode, PBUiBackground } from '@dcl/ecs'
import { UiBackgroundProps } from './types'

/**
 * @public
 */
/*#__PURE__*/
export function parseUiBackground(
  props: UiBackgroundProps | undefined
): PBUiBackground | undefined {
  if (!props || !Object.keys(props).length) return undefined
  return {
    ...props,
    uvs: props.uvs ?? [],
    // TBD: this should be optional IMO
    textureMode: props.textureMode ?? BackgroundTextureMode.CENTER
  }
}
