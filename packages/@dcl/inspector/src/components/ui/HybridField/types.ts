import type { Props as DropdownOption } from '../Dropdown/Option/types'
import type { Props as TextFieldProps } from '../TextField/types'

export type Props = {
  options: DropdownOption[]
  value?: Field['mainValue']
  placeholder?: string
  error?: string | boolean
  disabled?: boolean
  secondaryType?: FieldType
  secondaryOptions?: DropdownOption[]
  secondaryValue?: Field['secondaryValue']
  secondaryPlaceholder?: string
  secondaryError?: string | boolean
  secondaryDisabled?: boolean
  className?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  label?: React.ReactNode
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onChangeSecondary?: (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => void
}

export type Field = {
  mainValue?: React.OptionHTMLAttributes<HTMLElement>['value']
  secondaryValue?: React.OptionHTMLAttributes<HTMLElement>['value'] | TextFieldProps
}

export enum FieldType {
  DROPDOWN,
  TEXT_FIELD,
  COLOR_PICKER
}
