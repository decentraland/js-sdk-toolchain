import { PBUiInput } from '@dcl/ecs'
import { TextAlign, UiFont } from '../Label/types'

/**
 * @public
 */
export type UiInputProps = Omit<PBUiInput, 'font' | 'textAlign'> & {
  onChange?(value: string): void
  font?: UiFont
  textAlign?: TextAlign
}
