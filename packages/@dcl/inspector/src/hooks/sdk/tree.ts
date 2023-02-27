import { Node } from '../../components/Tree'

export const useTree = () => {
  const node: Node = {
    id: '1',
    label: '1',
    children: []
  }
  return [node, () => {}, () => {}, () => {}, () => {}] as const
}
