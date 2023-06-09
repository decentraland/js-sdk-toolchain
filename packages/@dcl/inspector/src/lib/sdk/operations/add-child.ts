import { Entity, IEngine, Transform as TransformEngine, Name as NameEngine } from '@dcl/ecs'

export function addChild(engine: IEngine) {
  return function addChild(parent: Entity, value: string) {
    const child = engine.addEntity()
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Name = engine.getComponent(NameEngine.componentId) as typeof NameEngine

    Name.create(child, { value })
    Transform.create(child, { parent })
  }
}

export default addChild
