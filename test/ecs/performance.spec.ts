import { components as engineComponents } from '../../packages/@dcl/ecs/src'
import { SandBox } from './utils'

describe.skip('Performance.', () => {
  it('should run 10k iterations', async () => {
    const { engine, components } = SandBox.create({ length: 1 })[0]
    const Transform = engineComponents.Transform(engine)
    const NUM_ENTITIES = 1000
    const NUM_ITERATIONS = 1000

    performance.mark('create-entities')
    for (let key = 0; key <= NUM_ENTITIES; key++) {
      const entity = engine.addEntity()

      Transform.create(entity, SandBox.DEFAULT_POSITION)

      if (key % 2) {
        components.Position.create(entity, {
          x: Math.random() * 10 + 1,
          y: Math.random() * 24 + 1
        })
      } else {
        components.Door.create(entity, { open: (Math.random() * 10) | 0 })
      }
    }
    performance.mark('end-create-entities')

    const EntitiesCreation = performance.measure('Entities creation', 'create-entities', 'end-create-entities')

    function doorSystem() {
      for (const [entity] of engine.getEntitiesWith(components.Door)) {
        components.Door.getMutable(entity).open = Math.random() * 10
      }
    }

    function transformSystem() {
      for (const [entity, readonlyPosition, readonlyTransform] of engine.getEntitiesWith(
        components.Position,
        Transform
      )) {
        Transform.getMutable(entity).position.x = readonlyPosition.x + Math.random() * 10
        components.Position.getMutable(entity).y = readonlyTransform.position.y + Math.random() * 10
      }
    }

    engine.addSystem(doorSystem)
    engine.addSystem(transformSystem)

    performance.mark('update')
    for (let dt = 0; dt <= NUM_ITERATIONS; dt++) {
      await engine.update(dt)
    }
    performance.mark('end-update')

    const EngineUpdate = performance.measure('Engine Updates', 'update', 'end-update')

    console.log(EntitiesCreation)
    console.log(EngineUpdate)
  })
})
