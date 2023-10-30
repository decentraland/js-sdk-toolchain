export type Props = {
  value?: string | number | readonly string[]
  label?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  secondaryText?: string
  description?: string
  error?: boolean
  selected?: boolean
  disabled?: boolean
  className?: string
  header?: string
  minWidth?: number
  onClick?: (event: any, value: any) => void
}
