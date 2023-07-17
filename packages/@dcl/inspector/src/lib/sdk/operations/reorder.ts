import { Entity, IEngine } from '@dcl/ecs'

import { EditorComponentNames, EditorComponents } from '../components'
import { move } from '../../utils/array'

export function reorder(engine: IEngine) {
  return function reorder(source: Entity, target: Entity, parent: Entity) {
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const nodes = Nodes.getMutable(engine.RootEntity).value
    const parentNode = nodes.find(($) => $.entity === parent)!
    const sourceIdx = parentNode.children.findIndex(($) => $ === source)
    const targetIdx = parentNode.children.findIndex(($) => $ === target)
    // we add 1 when moving upwards to simulate the "before" order
    const adjustment = targetIdx + (sourceIdx > targetIdx ? 1 : 0)
    const position = Math.max(0, target === parent ? 0 : adjustment)

    if (sourceIdx >= 0) move(parentNode.children, sourceIdx, position)
  }
}

export default reorder
