export type Props = {
  value?: string | number
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
  onClick?: (event: any, value: any) => void
}
