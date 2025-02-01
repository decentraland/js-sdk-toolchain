export interface PropTypes {
  value: string
  placeholder?: string
  disabled?: boolean
  onChange?: (value: string) => void
  onCancel?: () => void
  onSubmit?: (newValue: string) => void
  onBlur?: (event: FocusEvent) => void
}
