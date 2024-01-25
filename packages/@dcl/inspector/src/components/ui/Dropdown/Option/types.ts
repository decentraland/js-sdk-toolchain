import type { Props as TooltipProps } from '../..//InfoTooltip/types'

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
  leftContent?: React.ReactNode
  isField?: boolean
  tooltip?: TooltipProps | string
  onClick?: (event: any, value: any) => void
}
