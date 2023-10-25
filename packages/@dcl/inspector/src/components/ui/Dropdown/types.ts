import { Props as OptionProp } from './Option/types'

export type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: OptionProp[]
  label?: string
  className?: string
  disabled?: boolean
  value?: string | number | readonly string[]
}
