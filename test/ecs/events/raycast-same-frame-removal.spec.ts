import * as components from '../../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { createRaycastSystem } from '../../../packages/@dcl/ecs/src/systems/raycast'

describe('when a raycast is registered and removed in the same frame', () => {
  let engine: ReturnType<typeof Engine>
  let Raycast: ReturnType<typeof components.Raycast>
  let entity: Entity
  let callback: jest.Mock

  beforeEach(async () => {
    engine = Engine()
    Raycast = components.Raycast(engine)
    const raycastSystem = createRaycastSystem(engine)

    entity = engine.addEntity()
    callback = jest.fn()
    raycastSystem.registerLocalDirectionRaycast({ entity }, callback)
    raycastSystem.removeRaycasterEntity(entity)

    await engine.update(1)
  })

  it('should not ask the renderer for the raycast', () => {
    expect(Raycast.has(entity)).toBe(false)
  })

  it('should still not ask for it a tick later', async () => {
    await engine.update(1)

    expect(Raycast.has(entity)).toBe(false)
  })
})

describe('when a raycast is registered and left alone', () => {
  let engine: ReturnType<typeof Engine>
  let Raycast: ReturnType<typeof components.Raycast>
  let entity: Entity

  beforeEach(async () => {
    engine = Engine()
    Raycast = components.Raycast(engine)
    const raycastSystem = createRaycastSystem(engine)

    entity = engine.addEntity()
    raycastSystem.registerLocalDirectionRaycast({ entity }, jest.fn())

    await engine.update(1)
  })

  it('should ask the renderer for the raycast', () => {
    expect(Raycast.has(entity)).toBe(true)
  })
})

describe('when a raycast is removed and then registered again in the same frame', () => {
  let engine: ReturnType<typeof Engine>
  let Raycast: ReturnType<typeof components.Raycast>
  let entity: Entity

  beforeEach(async () => {
    engine = Engine()
    Raycast = components.Raycast(engine)
    const raycastSystem = createRaycastSystem(engine)

    entity = engine.addEntity()
    raycastSystem.registerLocalDirectionRaycast({ entity }, jest.fn())
    raycastSystem.removeRaycasterEntity(entity)
    raycastSystem.registerLocalDirectionRaycast({ entity }, jest.fn())

    await engine.update(1)
  })

  it('should honour the last thing the scene asked for', () => {
    expect(Raycast.has(entity)).toBe(true)
  })
})
