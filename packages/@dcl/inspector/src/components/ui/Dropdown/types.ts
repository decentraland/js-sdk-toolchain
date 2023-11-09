import { Props as OptionProp } from './Option/types'

export type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: OptionProp[]
  className?: string
  disabled?: boolean
  empty?: string
  label?: string
  value?: string | number | readonly string[]
  searchable?: boolean
  error?: string | boolean
}
