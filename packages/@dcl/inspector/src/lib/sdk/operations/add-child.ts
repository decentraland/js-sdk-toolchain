import { Entity, IEngine, LastWriteWinElementSetComponentDefinition, Transform, engine } from "@dcl/ecs"
import { EditorComponentIds, EditorComponents } from "../components"

export function addChild(engine: IEngine) {
  return function (parent: Entity, label: string, updateEngine = false) {
    const component = engine.getComponentOrNull(EditorComponentIds.EntityNode) as EditorComponents['EntityNode'] ?? Transform
    const child = engine.addEntity()
    component.create(child, { label, parent })
    if (updateEngine) return engine.update(1)
  }
}

export default addChild