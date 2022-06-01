import { SandBox } from './utils'

describe('Performance.', () => {
  it('should run 10k iterations', () => {
    const { engine, components } = SandBox.create({ length: 1 })[0]
    const { Transform } = engine.baseComponents
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

    const EntitiesCreation = performance.measure(
      'Entities creation',
      'create-entities',
      'end-create-entities'
    )

    function doorSystem() {
      for (const [_entity, door] of engine.mutableGroupOf(components.Door)) {
        door.open = Math.random() * 10
      }
    }

    function transformSystem() {
      for (const [_entity, position, transform] of engine.mutableGroupOf(
        components.Position,
        Transform
      )) {
        transform.position.x = position.x + Math.random() * 10
        position.y = transform.position.y + Math.random() * 10
      }
    }

    engine.addSystem(doorSystem)
    engine.addSystem(transformSystem)

    performance.mark('update')
    for (let dt = 0; dt <= NUM_ITERATIONS; dt++) {
      engine.update(dt)
    }
    performance.mark('end-update')

    const EngineUpdate = performance.measure(
      'Engine Updates',
      'update',
      'end-update'
    )

    console.log(EntitiesCreation)
    console.log(EngineUpdate)
  })
})
