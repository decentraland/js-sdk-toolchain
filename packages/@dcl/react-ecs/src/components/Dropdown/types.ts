import { PBUiDropdown } from '@dcl/ecs'
import { TextAlign, UiFont } from '../Label/types'

/**
 * @public
 */
export type UiDropdownProps = Partial<
  Omit<PBUiDropdown, 'textAlign' | 'font'>
> & {
  onChange?(value: number): void
  font?: UiFont
  textAlign?: TextAlign
}
