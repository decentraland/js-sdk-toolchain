export interface PropTypes {
  onDrop(files: File[]): void
  onHover?(isHover: boolean): void
  accept?: Record<string, string[]>
  disabled?: boolean
  multiple?: boolean
}
