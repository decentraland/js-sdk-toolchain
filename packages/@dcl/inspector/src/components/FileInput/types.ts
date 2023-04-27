import { Accept } from "react-dropzone"

export interface PropTypes {
  onDrop(files: File[]): void
  accept?: Accept
}