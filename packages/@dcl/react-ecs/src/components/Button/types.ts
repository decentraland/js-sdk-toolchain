import { UiLabelProps } from '../Label/types'
import { EntityPropTypes } from '../types'
/**
 * Button Component Props
 * @public
 */
export interface UiButtonProps extends UiLabelProps, EntityPropTypes {
  /**
   * Use any of the available button style types to create a styled button.
   */
  variant?: 'primary' | 'secondary'

  /**
   * Enable or disable the pointer events on the button
   */
  disabled?: boolean
}
