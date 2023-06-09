import { TreeNode } from '../ProjectView'

export interface Props {
  valueId: string
  value?: TreeNode
  getDragContext: () => unknown
  onSelect: () => void
  onRemove: (value: string) => void
  dndType: string
}
