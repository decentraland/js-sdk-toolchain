import { Props as Option } from '../Option/types'

export interface Props {
  options: Option[]
  empty?: string
  multiple?: boolean
  searchable?: boolean
  selectedValue?: Option | Option[]
  minWidth?: number
  isField?: boolean
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}
