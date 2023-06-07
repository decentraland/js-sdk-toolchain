import { Entity, IEngine, Transform as TransformEngine } from '@dcl/ecs'

export function setParent(engine: IEngine) {
  return function setParent(entity: Entity, parent: Entity) {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    Transform.createOrReplace(entity, { parent })
  }
}

export default setParent
