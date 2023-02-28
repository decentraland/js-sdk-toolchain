import { Engine, Schemas } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'

const engine = Engine()

const Transform = components.Transform(engine)
const Label = engine.defineComponent('inspector::Label', {
  label: Schemas.String
})
const Toggle = engine.defineComponent('inspector::Toggle', {})

const root = engine.addEntity()
Transform.create(root, { position: { x: 8, y: 0, z: 8 } })

const childA = engine.addEntity()
Transform.create(childA, { parent: root, position: { x: 1, y: 1, z: 0 } })

const childB = engine.addEntity()
Transform.create(childB, { parent: root, position: { x: 0, y: 1, z: 1 } })

void engine.update(0)

export { engine, Transform, Label, Toggle }
