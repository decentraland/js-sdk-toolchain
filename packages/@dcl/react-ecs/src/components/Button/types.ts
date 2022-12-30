import { PBUiText } from '@dcl/ecs'

/**
 * @public
 */
export type UiButtonProps = PBUiText & {
  type?: 'primary' | 'secondary'
}
