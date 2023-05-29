export enum BlurBehavior {
  SUBMIT = 0,
  CANCEL = 1,
  DO_NOTHING = 2
}

export interface PropTypes {
  value: string
  placeholder?: string
  blurBehavior?: BlurBehavior
  onChange?(value: string): void
  onCancel?: () => void
  onSubmit?: (newValue: string) => void
}
