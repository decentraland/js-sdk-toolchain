import { Entity, IEngine } from '@dcl/ecs'
import { EditorComponents, SdkComponents } from './components'
import * as components from '@dcl/ecs/dist/components'
import { ROOT } from './tree'

function getCloserTransformParent(
  entity: Entity,
  EntityNode: EditorComponents['EntityNode'],
  Transform: SdkComponents['Transform']
) {
  let parent = EntityNode.get(entity).parent

  while (parent !== ROOT && Transform.getOrNull(parent) === null) {
    const node = EntityNode.getOrNull(parent)
    if (node) {
      parent = node.parent
    } else {
      // TODO: Unconnected nodes, this cases should be fixed
      parent = ROOT
    }
  }

  return parent
}

export function getTransformNodeChecker(engine: IEngine, EntityNode: EditorComponents['EntityNode']) {
  const Transform = components.Transform(engine)
  const CheckIntervalSeconds = 1.0

  let t = 0
  return (dt: number) => {
    t += dt
    if (t < CheckIntervalSeconds) {
      return
    }

    for (const [entity, _, transform] of engine.getEntitiesWith(EntityNode, Transform)) {
      const parent = getCloserTransformParent(entity, EntityNode, Transform)
      if (transform.parent !== parent) {
        Transform.getMutable(entity).parent = parent
      }
    }
  }
}
