import { Entity, IEngine, Transform as TransformEngine, Name as NameEngine } from '@dcl/ecs'
import { EditorComponentNames, EditorComponents } from '../components'
import { pushChild } from '../nodes'

export function addChild(engine: IEngine) {
  return function addChild(parent: Entity, name: string): Entity {
    const child = engine.addEntity()
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Name = engine.getComponent(NameEngine.componentId) as typeof NameEngine

    // create new child components
    Name.create(child, { value: name })
    Transform.create(child, { parent })
    // update Nodes component
    Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, child) })

    return child
  }
}

export default addChild
