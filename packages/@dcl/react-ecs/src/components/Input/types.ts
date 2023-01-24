import { PBUiInput } from '@dcl/ecs'
import { TextAlignType, UiFontType } from '../Label/types'

/**
 * @public
 */
export type UiInputProps = Omit<PBUiInput, 'font' | 'textAlign'> & {
  onChange?(value: string): void
  font?: UiFontType
  textAlign?: TextAlignType
}
