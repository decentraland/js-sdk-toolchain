import { Engine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'

const engine = Engine()

const Transform = components.Transform(engine)

const root = engine.addEntity()
Transform.create(root, { position: { x: 8, y: 0, z: 8 } })

const childA = engine.addEntity()
Transform.create(childA, { parent: root, position: { x: 1, y: 1, z: 0 } })

const childB = engine.addEntity()
Transform.create(childB, { parent: root, position: { x: 0, y: 1, z: 1 } })

engine.update(0)

export { engine, Transform }
