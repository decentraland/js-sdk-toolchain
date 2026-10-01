import * as components from '../../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { createPhysicsSystem } from '../../../packages/@dcl/ecs/src/systems/physics'

describe('when a plain force replaces a repulsion from the same source', () => {
  let engine: ReturnType<typeof Engine>
  let PhysicsCombinedForce: ReturnType<typeof components.PhysicsCombinedForce>
  let physics: ReturnType<typeof createPhysicsSystem>
  let source: Entity

  beforeEach(async () => {
    engine = Engine()
    const Transform = components.Transform(engine)
    PhysicsCombinedForce = components.PhysicsCombinedForce(engine)
    physics = createPhysicsSystem(engine)

    Transform.create(engine.PlayerEntity, { position: { x: 10, y: 0, z: 0 } })
    source = engine.addEntity()
    await engine.update(1)

    physics.applyRepulsionForceToPlayer(source, { x: 0, y: 0, z: 0 }, 5)
    physics.applyForceToPlayer(source, { x: 0, y: 7, z: 0 })
  })

  it('should apply the new force straight away', () => {
    expect(PhysicsCombinedForce.get(engine.PlayerEntity).vector).toEqual({ x: 0, y: 7, z: 0 })
  })

  it('should keep it after the next tick', async () => {
    await engine.update(1)

    expect(PhysicsCombinedForce.get(engine.PlayerEntity).vector).toEqual({ x: 0, y: 7, z: 0 })
  })

  it('should keep it after several ticks', async () => {
    await engine.update(1)
    await engine.update(1)
    await engine.update(1)

    expect(PhysicsCombinedForce.get(engine.PlayerEntity).vector).toEqual({ x: 0, y: 7, z: 0 })
  })
})

describe('when a repulsion is left in place', () => {
  let engine: ReturnType<typeof Engine>
  let PhysicsCombinedForce: ReturnType<typeof components.PhysicsCombinedForce>
  let Transform: ReturnType<typeof components.Transform>

  beforeEach(async () => {
    engine = Engine()
    Transform = components.Transform(engine)
    PhysicsCombinedForce = components.PhysicsCombinedForce(engine)
    const physics = createPhysicsSystem(engine)

    Transform.create(engine.PlayerEntity, { position: { x: 10, y: 0, z: 0 } })
    const source = engine.addEntity()
    await engine.update(1)

    physics.applyRepulsionForceToPlayer(source, { x: 0, y: 0, z: 0 }, 5)
  })

  it('should keep tracking the player as they move', async () => {
    Transform.getMutable(engine.PlayerEntity).position = { x: 0, y: 0, z: 10 }
    await engine.update(1)

    expect(PhysicsCombinedForce.get(engine.PlayerEntity).vector).toEqual({ x: 0, y: 0, z: 5 })
  })
})
