import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import type { Props as TextFieldProps } from '../TextField/types'

export type Props = Omit<TextFieldProps, 'accept' | 'type' | 'onDrop'> & {
  accept?: string[]
  isEnabledFileExplorer?: boolean
  onDrop?: (path: string) => void | Promise<void>
  isValidFile?: (node: TreeNode) => boolean
}
