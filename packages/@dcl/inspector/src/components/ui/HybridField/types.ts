import type { Props as DropdownOption } from '../Dropdown/Option/types'

export type Props = {
  options: DropdownOption[]
  value?: Field['mainValue']
  placeholder?: string
  error?: string | boolean
  disabled?: boolean
  secondaryOptions?: DropdownOption[]
  secondaryValue?: Field['secondaryValue']
  secondaryPlaceholder?: string
  secondaryError?: string | boolean
  secondaryDisabled?: boolean
  className?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onChange?: (value: Field) => void
}

export type Field = {
  mainValue?: string | number | readonly string[]
  secondaryValue?: string | number | readonly string[]
}
