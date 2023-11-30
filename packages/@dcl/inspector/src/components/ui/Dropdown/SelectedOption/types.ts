import { Props as Option } from '../Option/types'

export interface Props {
  selectedValue: Option | Option[]
  minWidth?: number
  multiple?: boolean
  onRemove?: (event: any, value: any) => void
}
