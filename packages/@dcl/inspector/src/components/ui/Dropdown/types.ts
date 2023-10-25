import { Props as OptionProp } from './Option/types'

export type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: OptionProp[]
  label?: string
  error?: string | boolean
  className?: string
  disabled?: boolean
}
