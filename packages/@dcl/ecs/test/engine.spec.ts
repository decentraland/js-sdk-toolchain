import { Vector3 } from '@dcl/ecs-math'
import { Float32, MapType } from '../src/built-in-types'
import { Engine } from '../src/engine'
import { createByteBuffer } from '../src/serialization/ByteBuffer'
import { createRendererTransport } from '../src/systems/crdt/transports/rendererTransport'

const PositionType = MapType({
  x: Float32
})

const VelocityType = MapType({
  y: Float32
})

describe('Engine tests', () => {
  it('generates new entities', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    expect(entityA).toBe(0)
    expect(entityB).toBe(1)
  })

  it('should not allow u to create same component to an existing entitiy', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent(888, PositionType)
    Position.create(entity, { x: 1 })
    expect(() => Position.create(entity, { x: 10 })).toThrowError()
  })

  it('should throw an error if the component doesnt exist', () => {
    const engine = Engine()
    const Position = engine.defineComponent(888, PositionType)
    const entity = engine.addEntity()
    const entityB = engine.addEntity()
    expect(() => Position.mutable(entity)).toThrowError()
    expect(() => Position.toBinary(entity)).toThrowError()
    Position.create(entityB, { x: 10 })
    const binary = Position.toBinary(entityB)
    expect(() => Position.updateFromBinary(entity, binary)).toThrowError()
  })

  it('should delete component if exists or not', () => {
    const engine = Engine()
    const Position = engine.defineComponent(888, PositionType)
    const entity = engine.addEntity()
    const entity2 = engine.addEntity()
    Position.create(entity, { x: 10 })
    expect(Position.deleteFrom(entity)).toStrictEqual({ x: 10 })
    expect(Position.deleteFrom(entity2)).toStrictEqual(null)
  })

  it('should fail when trying to add the same system twice', () => {
    const engine = Engine()
    const system = () => {}
    engine.addSystem(system)
    expect(() => engine.addSystem(system)).toThrowError()
  })

  it('should replace existing component with the new one', () => {
    const engine = Engine()
    const Position = engine.defineComponent(888, PositionType)
    const entity = engine.addEntity()
    Position.create(entity, { x: 1 })
    Position.createOrReplace(entity, { x: 10 })
    expect(Position.getFrom(entity)).toStrictEqual({ x: 10 })
  })

  it('define component and creates new entity', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(888, PositionType)
    const posComponent = Position.create(entity, { x: 10 })
    expect(posComponent).toStrictEqual({ x: 10 })

    for (const [ent, position] of engine.groupOf(Position)) {
      expect(ent).toBe(entity)
      expect(position).toStrictEqual({ x: 10 })
    }

    for (const [ent, position] of engine.mutableGroupOf(Position)) {
      expect(ent).toBe(entity)
      expect(position).toStrictEqual({ x: 10 })
      position.x = 80
    }
    expect(Position.getFrom(entity)).toStrictEqual({ x: 80 })
  })

  it('should fail if we try to fetch a component not deifned', () => {
    const engine = Engine()
    expect(() => engine.getComponent(1238)).toThrowError()
  })

  it('iterate multiple components', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(888, PositionType)
    const Velocity = engine.defineComponent(222, VelocityType)
    const posComponent = Position.create(entity, { x: 10 })
    const velComponent = Velocity.create(entity, { y: 20 })

    expect(posComponent).toStrictEqual({ x: 10 })
    expect(velComponent).toStrictEqual({ y: 20 })

    for (const [ent, position] of engine.groupOf(Position)) {
      const velocity = Velocity.getFrom(ent)
      expect(ent).toBe(entity)
      expect(velocity).toStrictEqual({ y: 20 })
      expect(position).toStrictEqual({ x: 10 })
    }
  })

  it('should not update a readonly prop', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(888, PositionType)
    expect(Array.from(Position.dirtyIterator())).toEqual([])
    const posComponent = Position.create(entity, { x: 10 })
    posComponent.x = 1000000000000
    expect(Array.from(Position.dirtyIterator())).toEqual([entity])
    expect(Position.getFrom(entity)).toStrictEqual({ x: 1000000000000 })
  })

  it('should not update a readonly prop groupOf', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(888, PositionType)
    const _posComponent = Position.create(entity, { x: 10 })
    for (const [_entity, position] of engine.groupOf(Position)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => (position.x = 1000000000000)).toThrowError()
    }
    expect(Position.getFrom(entity)).toStrictEqual({ x: 10 })
  })

  it('should not update a readonly prop getFrom(entity)', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(888, PositionType)
    Position.create(entity, { x: 10 })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const assignError = () => (Position.getFrom(entity).x = 1000000000000)
    expect(assignError).toThrowError()
    expect(Position.getFrom(entity)).toStrictEqual({ x: 10 })
  })

  it('should fail if we fetch a component that doesnt exists on an entity', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(888, PositionType)
    const Velocity = engine.defineComponent(222, VelocityType)
    Position.create(entity, { x: 10 })
    expect(() => Velocity.getFrom(entity)).toThrowError()
  })

  it('should return null if the component not exists on the entity.', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(888, PositionType)
    const Velocity = engine.defineComponent(222, VelocityType)
    Position.create(entity, { x: 10 })
    expect(Velocity.getOrNull(entity)).toBe(null)
  })

  it('should throw an error if the component class id already exists', () => {
    const engine = Engine()
    const COMPONENT_ID = 888
    engine.defineComponent(COMPONENT_ID, PositionType)
    const Velocity = () => engine.defineComponent(COMPONENT_ID, VelocityType)
    expect(Velocity).toThrowError()
  })

  it('should return mutable obj if use component.mutable()', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const COMPONENT_ID = 888
    const Position = engine.defineComponent(COMPONENT_ID, PositionType)
    Position.create(entity, { x: 10 })
    Position.mutable(entity).x = 8888
    expect(Position.getFrom(entity)).toStrictEqual({ x: 8888 })
  })

  it('should destroy an entity', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const entityB = engine.addEntity() // 0
    const COMPONENT_ID = 888
    const Position = engine.defineComponent(COMPONENT_ID, PositionType)
    const Velocity = engine.defineComponent(COMPONENT_ID + 1, VelocityType)
    Position.create(entity, { x: 10 })
    Position.create(entityB, { x: 20 })
    Velocity.create(entity, { y: 20 })

    expect(Position.getOrNull(entity)).toStrictEqual({ x: 10 })
    expect(Velocity.getOrNull(entity)).toStrictEqual({ y: 20 })

    engine.removeEntity(entity)

    expect(Position.getOrNull(entity)).toBe(null)
    expect(Velocity.getOrNull(entity)).toBe(null)
    expect(Position.getOrNull(entityB)).toStrictEqual({ x: 20 })
  })

  it('should return mutableGroupOf multiples components', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const COMPONENT_ID = 888
    const Position = engine.defineComponent(COMPONENT_ID, PositionType)
    const Position2 = engine.defineComponent(COMPONENT_ID + 1, PositionType)
    const Velocity = engine.defineComponent(COMPONENT_ID + 2, VelocityType)
    Position.create(entityA, { x: 0 })
    Position2.create(entityA, { x: 8 })
    Velocity.create(entityA, { y: 1 })
    Velocity.create(entityB, { y: 1 })

    for (const [entity, velocity, position, position2] of engine.mutableGroupOf(
      Velocity,
      Position,
      Position2
    )) {
      expect(entity).toBe(entityA)
      expect(velocity).toStrictEqual({ y: 1 })
      expect(position).toStrictEqual({ x: 0 })
      expect(position2).toStrictEqual({ x: 8 })
    }
  })

  it('should return mutableGroupOf single component', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const COMPONENT_ID = Math.random() | 0
    const Position = engine.defineComponent(COMPONENT_ID, PositionType)
    const Velocity = engine.defineComponent(COMPONENT_ID + 2, VelocityType)
    Position.create(entityA, { x: 0 })
    Velocity.create(entityA, { y: 1 })
    Velocity.create(entityB, { y: 10 })

    // avoid dirty iterators
    engine.update(0)

    for (const [entity, position] of engine.mutableGroupOf(Position)) {
      expect(entity).toBe(entityA)
      expect(position).toStrictEqual({ x: 0 })
      expect(Velocity.getFrom(entity)).toStrictEqual({ y: 1 })
    }
    expect(Array.from(Velocity.dirtyIterator())).toEqual([])
    expect(Array.from(Position.dirtyIterator())).toEqual([entityA])
  })

  it('should return mutableGroupOf multi component & entities', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const entityC = engine.addEntity()
    const COMPONENT_ID = Math.random() | 0
    const Position = engine.defineComponent(COMPONENT_ID, PositionType)
    const Velocity = engine.defineComponent(COMPONENT_ID + 2, VelocityType)
    Position.create(entityA, { x: 0 })
    Position.create(entityB, { x: 1 })
    Position.create(entityC, { x: 2 })
    Velocity.create(entityA, { y: 0 })
    Velocity.create(entityB, { y: 1 })

    // avoid dirty iterators
    engine.update(0)

    const [component1, component2, component3] = Array.from(
      engine.mutableGroupOf(Position, Velocity)
    )
    expect(component1).toStrictEqual([entityA, { x: 0 }, { y: 0 }])
    expect(component2).toStrictEqual([entityB, { x: 1 }, { y: 1 }])
    expect(component3).toBe(undefined)
    expect(Array.from(Velocity.dirtyIterator())).toEqual([entityA, entityB])
    expect(Array.from(Position.dirtyIterator())).toEqual([entityA, entityB])
  })

  it('should return groupOf multi component & entities', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const entityC = engine.addEntity()
    const COMPONENT_ID = Math.random() | 0
    const Position = engine.defineComponent(COMPONENT_ID, PositionType)
    const Velocity = engine.defineComponent(COMPONENT_ID + 2, VelocityType)
    Position.create(entityA, { x: 0 })
    Position.create(entityB, { x: 1 })
    Position.create(entityC, { x: 2 })
    Velocity.create(entityA, { y: 0 })
    Velocity.create(entityB, { y: 1 })

    // avoid dirty iterators
    engine.update(0)

    const [component1, component2, component3] = Array.from(
      engine.groupOf(Position, Velocity)
    )
    expect(component1).toStrictEqual([entityA, { x: 0 }, { y: 0 }])
    expect(component2).toStrictEqual([entityB, { x: 1 }, { y: 1 }])
    expect(component3).toBe(undefined)
    expect(Array.from(Velocity.dirtyIterator())).toEqual([])
    expect(Array.from(Position.dirtyIterator())).toEqual([])
  })

  it('should return isDirty if we mutate the component', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    engine.baseComponents.BoxShape.create(entityA, {
      withCollisions: false,
      isPointerBlocker: true,
      visible: false,
      uvs: []
    })
    expect(engine.baseComponents.BoxShape.isDirty(entityA)).toBe(true)
    engine.update(1)
    expect(engine.baseComponents.BoxShape.isDirty(entityA)).toBe(false)
    engine.baseComponents.BoxShape.mutable(entityA)
    expect(engine.baseComponents.BoxShape.isDirty(entityA)).toBe(true)
  })

  it('should fail to write to byte buffer if the entity not exists', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const buf = createByteBuffer()
    expect(() =>
      engine.baseComponents.BoxShape.writeToByteBuffer(entityA, buf)
    ).toThrowError('')
  })

  it('should remove component when using deleteFrom', () => {
    const engine = Engine()
    const MoveTransportData = MapType({
      duration: Float32,
      speed: Float32
    })
    engine.defineComponent(888, MoveTransportData)
    const zombie = engine.addEntity()

    const MoveTransformComponent = engine.defineComponent(46, MoveTransportData)

    let moves = 0

    function moveSystem(_dt: number) {
      moves++
      for (const [entity, move] of engine.mutableGroupOf(
        MoveTransformComponent
      )) {
        move.speed += 1
        engine.baseComponents.Transform.mutable(entity).position =
          Vector3.Zero()
        if (moves === 2) {
          MoveTransformComponent.deleteFrom(entity)
        }
      }
    }

    MoveTransformComponent.create(zombie, {
      duration: 10,
      speed: 1
    })

    engine.baseComponents.Transform.create(zombie, {
      position: { x: 12, y: 1, z: 3 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    })

    engine.addSystem(moveSystem)

    expect(MoveTransformComponent.getFrom(zombie)).toStrictEqual({
      duration: 10,
      speed: 1
    })
    engine.update(1)
    expect(MoveTransformComponent.getFrom(zombie)).toStrictEqual({
      speed: 2,
      duration: 10
    })
    engine.update(1)
    expect(MoveTransformComponent.getOrNull(zombie)).toStrictEqual(null)
  })

  it('should remove Transform component and send it throught the network', () => {
    const engine = Engine({ transports: [createRendererTransport()] })
    const entity = engine.addEntity()

    let moves = 0
    const { Transform } = engine.baseComponents

    function moveSystem(_dt: number) {
      moves++
      for (const [ent, transform] of engine.mutableGroupOf(Transform)) {
        transform.position.x += 1
        if (moves === 2) {
          Transform.deleteFrom(ent)
        }
      }
    }

    Transform.create(entity, {
      position: { x: 12, y: 1, z: 3 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    })

    engine.addSystem(moveSystem)

    expect(Transform.getFrom(entity)).toStrictEqual({
      position: { x: 12, y: 1, z: 3 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    })
    engine.update(1)
    expect(Transform.getFrom(entity).position.x).toStrictEqual(13)
    engine.update(1)
    expect(Transform.getOrNull(entity)).toStrictEqual(null)
  })
})
