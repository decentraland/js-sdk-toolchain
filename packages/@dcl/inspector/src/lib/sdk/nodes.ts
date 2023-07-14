import { Entity, IEngine } from '@dcl/ecs'

import { EditorComponentNames, EditorComponents, Node } from './components'
import { cleanPush } from '../utils/array'

export function removeNode(engine: IEngine, entity: Entity): Node[] {
  const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
  const nodes = Nodes.get(engine.RootEntity).value
  const newValue: Node[] = []

  for (const $ of nodes) {
    if ($.entity === entity) continue
    newValue.push(filterChild($, entity))
  }

  return newValue
}

export function pushChild(engine: IEngine, parent: Entity, child: Entity): Node[] {
  const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
  const nodes = Nodes.get(engine.RootEntity).value
  const newValue: Node[] = []
  let alreadyInNodes = false

  for (const $ of nodes) {
    if ($.entity === parent) {
      newValue.push({ entity: $.entity, children: cleanPush($.children, child) })
    } else {
      newValue.push($)
    }
    alreadyInNodes ||= $.entity === child
  }

  return alreadyInNodes ? newValue : [...newValue, { entity: child, children: [] }]
}

export function removeChild(engine: IEngine, parent: Entity, child: Entity): Node[] {
  const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
  const nodes = Nodes.get(engine.RootEntity).value
  const newValue: Node[] = []

  for (const $ of nodes) {
    if ($.entity === parent) {
      newValue.push(filterChild($, child))
    } else {
      newValue.push($)
    }
  }

  return newValue
}

export function filterChild({ entity, children }: Node, child: Entity): Node {
  return {
    entity,
    children: children.filter(($) => $ !== child)
  }
}
