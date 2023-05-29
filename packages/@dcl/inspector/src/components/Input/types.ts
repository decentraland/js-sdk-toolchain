export enum BlurBehavior {
  CANCEL = 0,
  DO_NOTHING = 1
}

export interface PropTypes {
  value: string
  placeholder?: string
  blurBehavior?: BlurBehavior
  onChange?(value: string): void
  onCancel?: () => void
  onSubmit?: (newValue: string) => void
}
