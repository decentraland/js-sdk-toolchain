import { PBUiDropdown } from '@dcl/ecs'
import { TextAlignType, UiFontType } from '../Label/types'
import { EntityPropTypes } from '../types'

/**
 * @public
 * Dropdown Props
 */
export interface UiDropdownProps
  extends EntityPropTypes,
    Omit<Partial<PBUiDropdown>, 'textAlign' | 'font'> {
  onChange?(value: number): void
  font?: UiFontType
  textAlign?: TextAlignType
}
