import { PBUiDropdown } from '@dcl/ecs'
import { TextAlignType, UiFontType } from '../Label/types'

/**
 * @public
 */
export type UiDropdownProps = Partial<Omit<PBUiDropdown, 'textAlign' | 'font'>> & {
  onChange?(value: number): void
  font?: UiFontType
  textAlign?: TextAlignType
}
