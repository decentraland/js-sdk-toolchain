import { Entity, IEngine, Transform } from '@dcl/ecs'
import { EditorComponentIds, EditorComponents } from '../components'

export function addChild(engine: IEngine) {
  return function addChild(parent: Entity, label: string) {
    const component =
      (engine.getComponentOrNull(EditorComponentIds.EntityNode) as EditorComponents['EntityNode']) ?? Transform
    const child = engine.addEntity()
    component.create(child, { label, parent })
  }
}

export default addChild
