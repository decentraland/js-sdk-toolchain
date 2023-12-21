import { Props as Option } from '../Option/types'

export type Props = {
  value: Option[]
  minWidth?: number
  className?: string
  onClick?: (event: any, value: any) => void
  onRemove?: (event: any, value: any) => void
}
