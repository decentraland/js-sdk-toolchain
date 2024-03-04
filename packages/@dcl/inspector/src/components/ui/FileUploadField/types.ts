import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import type { Props as TextFieldProps } from '../TextField/types'

export type Props = Omit<TextFieldProps, 'accept' | 'type' | 'onDrop'> & {
  accept?: string[]
  isEnabledFileExplorer?: boolean
  onDrop?: (path: string) => void | Promise<void>
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  isValidFile?: (node: TreeNode) => boolean
  showPreview?: boolean
}

export const ACCEPTED_FILE_TYPES = {
  model: ['.gltf', '.glb'],
  image: ['.png'],
  audio: ['.mp3', '.wav', '.ogg'],
  video: ['.mp4']
}
