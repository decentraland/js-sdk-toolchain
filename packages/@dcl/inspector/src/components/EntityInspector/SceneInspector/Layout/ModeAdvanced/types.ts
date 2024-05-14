export type Value = { coords: string; base: string }

export type Props = {
  value: Value
  disabled: boolean
  onChange: (value: Value) => void
  onSubmit: (value: Value) => void
  onGoBack: () => void
}
