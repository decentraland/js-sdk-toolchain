export interface PropTypes {
  value: string
  placeholder?: string
  onChange?: (value: string) => void
  onCancel?: () => void
  onSubmit?: (newValue: string) => void
  onBlur?: (event: FocusEvent) => void
}
