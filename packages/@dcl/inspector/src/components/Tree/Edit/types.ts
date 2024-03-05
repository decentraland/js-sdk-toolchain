export interface Props {
  value: string
  onCancel: () => void
  onSubmit: (newValue: string) => void
}
