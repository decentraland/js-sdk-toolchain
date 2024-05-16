export type Value = { coords: string; base: string }

export type Props = {
  value: Value
  disabled: boolean
  onSubmit: (value: Value) => void
  onGoBack: () => void
}
