import { Props as OptionProp } from './Option/types'

export type DropdownChangeEvent = React.ChangeEvent<HTMLSelectElement> & {
  target: EventTarget &
    HTMLSelectElement & {
      value: string | string[]
    }
}

export type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: OptionProp[]
  className?: string
  disabled?: boolean
  empty?: string
  label?: React.ReactNode
  value?: string | number | readonly string[] | any[]
  searchable?: boolean
  error?: string | boolean
  info?: React.ReactNode
  multiple?: boolean
  clearable?: boolean
  trigger?: React.ReactNode
}
