export interface PropTypes {
  minWidth?: 'initial' | number
  initialWidth?: number
  onChange?(value: [number, number]): void
}
