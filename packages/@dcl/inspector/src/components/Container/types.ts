export type Props = {
  label?: string
  className?: string
  rightContent?: JSX.Element
  initialOpen?: boolean
  indicator?: boolean | string | JSX.Element
  border?: boolean
  gap?: boolean
  onRemoveContainer?: () => void
}
