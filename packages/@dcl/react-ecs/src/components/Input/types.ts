import { PBUiInput } from '@dcl/ecs'
import { TextAlignType, UiFontType } from '../Label/types'

/**
 * @public
 */
export interface UiInputProps extends Omit<PBUiInput, 'font' | 'textAlign'> {
  /** function to be called on value change  */
  onChange?(value: string): void
  /** function to be called on text field submit  */
  onSubmit?(value: string): void
  font?: UiFontType
  textAlign?: TextAlignType
}
