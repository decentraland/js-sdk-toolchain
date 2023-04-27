export interface PropTypes {
  onDrop(files: File[]): void
  accept?: Record<string, string[]>
  disabled?: boolean
}
