import { Engine } from '../../packages/@dcl/ecs/src'
import { EntityUtils } from '../../packages/@dcl/ecs/src/engine/entity-utils'

describe('MonsterDB test', () => {
  it('stress test for entities', () => {
    const engine = Engine()

    Array.from({ length: EntityUtils.DYNAMIC_ENTITIES_START_AT + 10 }).forEach(
      () => {
        engine.addEntity()
      }
    )
    engine.update(1)
    expect(engine.addEntity()).toBe(
      EntityUtils.DYNAMIC_ENTITIES_START_AT +
        EntityUtils.RESERVED_STATIC_ENTITIES +
        10
    )
  })
})
