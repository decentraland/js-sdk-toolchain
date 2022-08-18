import { Vector3 } from '@dcl/ecs-math'
import { Engine } from '../src/engine'
import { SYSTEMS_REGULAR_PRIORITY } from '../src/engine/systems'
import EntityUtils from '../src/engine/entity-utils'
import { createByteBuffer } from '../src/serialization/ByteBuffer'
import { createRendererTransport } from '../src/systems/crdt/transports/rendererTransport'
import { Schemas } from '../src/schemas'
import { TransformSchema } from '../src/components/legacy/Transform'

const PositionSchema = {
  x: Schemas.Float
}

const VelocitySchema = {
  y: Schemas.Float
}

describe('Engine tests', () => {
  it('generates new entities', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    expect(entityA).toBe(EntityUtils.STATIC_ENTITIES_RANGE[0])
    expect(entityB).toBe(EntityUtils.STATIC_ENTITIES_RANGE[0] + 1)
  })

  it('should not allow u to create same component to an existing entitiy', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent(PositionSchema, 888)
    Position.create(entity, { x: 1 })
    expect(() => Position.create(entity, { x: 10 })).toThrowError()
  })

  it('should throw an error if the component doesnt exist', () => {
    const engine = Engine()
    const Position = engine.defineComponent(PositionSchema, 888)
    const entity = engine.addEntity()
    const entityB = engine.addEntity()
    expect(() => Position.getMutable(entity)).toThrowError()
    expect(() => Position.toBinary(entity)).toThrowError()
    Position.create(entityB, { x: 10 })
    const binary = Position.toBinary(entityB)
    expect(() => Position.updateFromBinary(entity, binary)).toThrowError()
  })

  it('should delete component if exists or not', () => {
    const engine = Engine()
    const Position = engine.defineComponent(PositionSchema, 888)
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

    const systemA = () => {}
    const systemA2 = () => {}
    engine.addSystem(systemA, SYSTEMS_REGULAR_PRIORITY, 'systemA')
    expect(() =>
      engine.addSystem(systemA2, SYSTEMS_REGULAR_PRIORITY, 'systemA')
    ).toThrowError()
  })

  it('should replace existing component with the new one', () => {
    const engine = Engine()
    const Position = engine.defineComponent(PositionSchema, 888)
    const entity = engine.addEntity()
    Position.create(entity, { x: 1 })
    Position.createOrReplace(entity, { x: 10 })
    expect(Position.get(entity)).toStrictEqual({ x: 10 })
  })

  it('define component and creates new entity', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 888)
    const posComponent = Position.create(entity, { x: 10 })
    expect(posComponent).toStrictEqual({ x: 10 })

    for (const [ent, position] of engine.getEntitiesWith(Position)) {
      expect(ent).toBe(entity)
      expect(position).toStrictEqual({ x: 10 })
    }

    for (const [ent, _readOnlyPosition] of engine.getEntitiesWith(Position)) {
      const position = Position.getMutable(ent)
      expect(ent).toBe(entity)
      expect(position).toStrictEqual({ x: 10 })
      position.x = 80
    }
    expect(Position.get(entity)).toStrictEqual({ x: 80 })
  })

  it('should fail if we try to fetch a component not deifned', () => {
    const engine = Engine()
    expect(() => engine.getComponent(1238)).toThrowError()
  })

  it('iterate multiple components', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 888)
    const Velocity = engine.defineComponent(VelocitySchema, 222)
    const posComponent = Position.create(entity, { x: 10 })
    const velComponent = Velocity.create(entity, { y: 20 })

    expect(posComponent).toStrictEqual({ x: 10 })
    expect(velComponent).toStrictEqual({ y: 20 })

    for (const [ent, position] of engine.getEntitiesWith(Position)) {
      const velocity = Velocity.get(ent)
      expect(ent).toBe(entity)
      expect(velocity).toStrictEqual({ y: 20 })
      expect(position).toStrictEqual({ x: 10 })
    }
  })

  it('define two custom components multiple components without ids', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 123)
    const Velocity = engine.defineComponent(VelocitySchema, 124)
    const posComponent = Position.create(entity, { x: 10 })
    const velComponent = Velocity.create(entity, { y: 20 })

    expect(posComponent).toStrictEqual({ x: 10 })
    expect(velComponent).toStrictEqual({ y: 20 })

    for (const [ent, position] of engine.getEntitiesWith(Position)) {
      const velocity = Velocity.get(ent)
      expect(ent).toBe(entity)
      expect(velocity).toStrictEqual({ y: 20 })
      expect(position).toStrictEqual({ x: 10 })
    }
  })

  it('should not update a readonly prop', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 888)
    expect(Array.from(Position.dirtyIterator())).toEqual([])
    const posComponent = Position.create(entity, { x: 10 })
    posComponent.x = 1000000000000
    expect(Array.from(Position.dirtyIterator())).toEqual([entity])
    expect(Position.get(entity)).toStrictEqual({ x: 1000000000000 })
  })

  it('should not update a readonly prop groupOf', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 888)
    const _posComponent = Position.create(entity, { x: 10 })
    for (const [_entity, position] of engine.getEntitiesWith(Position)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => (position.x = 1000000000000)).toThrowError()
    }
    expect(Position.get(entity)).toStrictEqual({ x: 10 })
  })

  it('should not update a readonly prop getFrom(entity)', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 888)
    Position.create(entity, { x: 10 })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const assignError = () => (Position.get(entity).x = 1000000000000)
    expect(assignError).toThrowError()
    expect(Position.get(entity)).toStrictEqual({ x: 10 })
  })

  it('should fail if we fetch a component that doesnt exists on an entity', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 888)
    const Velocity = engine.defineComponent(VelocitySchema, 222)
    Position.create(entity, { x: 10 })
    expect(() => Velocity.get(entity)).toThrowError()
  })

  it('should return null if the component not exists on the entity.', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent(PositionSchema, 888)
    const Velocity = engine.defineComponent(VelocitySchema, 222)
    Position.create(entity, { x: 10 })
    expect(Velocity.getOrNull(entity)).toBe(null)
  })

  it('should throw an error if the component class id already exists', () => {
    const engine = Engine()
    const COMPONENT_ID = 888
    engine.defineComponent(PositionSchema, COMPONENT_ID)
    const Velocity = () => engine.defineComponent(VelocitySchema, COMPONENT_ID)
    expect(Velocity).toThrowError()
  })

  it('should return mutable obj if use component.getMutable()', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const COMPONENT_ID = 888
    const Position = engine.defineComponent(PositionSchema, COMPONENT_ID)
    Position.create(entity, { x: 10 })
    Position.getMutable(entity).x = 8888
    expect(Position.get(entity)).toStrictEqual({ x: 8888 })
  })

  it('should destroy an entity', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const entityB = engine.addEntity() // 0
    const COMPONENT_ID = 888
    const Position = engine.defineComponent(PositionSchema, COMPONENT_ID)
    const Velocity = engine.defineComponent(VelocitySchema, COMPONENT_ID + 1)
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

  it('should return get entities with multiples components', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const COMPONENT_ID = 888
    const Position = engine.defineComponent(PositionSchema, COMPONENT_ID)
    const Position2 = engine.defineComponent(PositionSchema, COMPONENT_ID + 1)
    const Velocity = engine.defineComponent(VelocitySchema, COMPONENT_ID + 2)
    Position.create(entityA, { x: 0 })
    Position2.create(entityA, { x: 8 })
    Velocity.create(entityA, { y: 1 })
    Velocity.create(entityB, { y: 1 })

    for (const [
      entity,
      readonlyVelocity,
      readonlyPosition,
      readonlyPosition2
    ] of engine.getEntitiesWith(Velocity, Position, Position2)) {
      expect(entity).toBe(entityA)
      expect(readonlyVelocity).toStrictEqual({ y: 1 })
      expect(readonlyPosition).toStrictEqual({ x: 0 })
      expect(readonlyPosition2).toStrictEqual({ x: 8 })
    }
  })

  it('should return mutableGroupOf single component', () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const COMPONENT_ID = Math.random() | 0
    const Position = engine.defineComponent(PositionSchema, COMPONENT_ID)
    const Velocity = engine.defineComponent(VelocitySchema, COMPONENT_ID + 2)
    Position.create(entityA, { x: 0 })
    Velocity.create(entityA, { y: 1 })
    Velocity.create(entityB, { y: 10 })

    // avoid dirty iterators
    engine.update(0)

    for (const [entity, _readonlyPosition] of engine.getEntitiesWith(
      Position
    )) {
      const position = Position.getMutable(entity)
      expect(entity).toBe(entityA)
      expect(position).toStrictEqual({ x: 0 })
      expect(Velocity.get(entity)).toStrictEqual({ y: 1 })
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
    const Position = engine.defineComponent(PositionSchema, COMPONENT_ID)
    const Velocity = engine.defineComponent(VelocitySchema, COMPONENT_ID + 2)
    Position.create(entityA, { x: 0 })
    Position.create(entityB, { x: 1 })
    Position.create(entityC, { x: 2 })
    Velocity.create(entityA, { y: 0 })
    Velocity.create(entityB, { y: 1 })

    // avoid dirty iterators
    engine.update(0)

    const [component1, component2, component3] = Array.from(
      engine.getEntitiesWith(Position, Velocity)
    ).map(([entity]) => [
      entity,
      Position.getMutable(entity),
      Velocity.getMutable(entity)
    ])

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
    const Position = engine.defineComponent(PositionSchema, COMPONENT_ID)
    const Velocity = engine.defineComponent(VelocitySchema, COMPONENT_ID + 2)
    Position.create(entityA, { x: 0 })
    Position.create(entityB, { x: 1 })
    Position.create(entityC, { x: 2 })
    Velocity.create(entityA, { y: 0 })
    Velocity.create(entityB, { y: 1 })

    // avoid dirty iterators
    engine.update(0)

    const [component1, component2, component3] = Array.from(
      engine.getEntitiesWith(Position, Velocity)
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
    engine.baseComponents.BoxShape.getMutable(entityA)
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
    const MoveTransportData = {
      duration: Schemas.Float,
      speed: Schemas.Float
    }
    engine.defineComponent(MoveTransportData, 888)
    const zombie = engine.addEntity()

    const MoveTransformComponent = engine.defineComponent(MoveTransportData, 46)

    let moves = 0

    function moveSystem(_dt: number) {
      moves++
      for (const [entity, _readonlyMove] of engine.getEntitiesWith(
        MoveTransformComponent
      )) {
        const move = MoveTransformComponent.getMutable(entity)
        move.speed += 1
        engine.baseComponents.Transform.getMutable(entity).position =
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

    expect(MoveTransformComponent.get(zombie)).toStrictEqual({
      duration: 10,
      speed: 1
    })
    engine.update(1)
    expect(MoveTransformComponent.get(zombie)).toStrictEqual({
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
      for (const [ent] of engine.getEntitiesWith(Transform)) {
        Transform.getMutable(ent).position.x += 1
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

    expect(Transform.get(entity)).toStrictEqual({
      position: { x: 12, y: 1, z: 3 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    })
    engine.update(1)
    expect(Transform.get(entity).position.x).toStrictEqual(13)
    engine.update(1)
    expect(Transform.getOrNull(entity)).toStrictEqual(null)
  })

  it('should run in the order', () => {
    const array: string[] = []
    const engine = Engine()
    function systemA() {
      array.push('A')
    }
    function systemB() {
      array.push('B')
    }
    function systemC() {
      array.push('C')
    }

    engine.addSystem(systemA, 200e3)
    engine.addSystem(systemB, 10)
    engine.addSystem(systemC)

    engine.update(0)
    expect(array).toStrictEqual(['A', 'C', 'B'])
  })

  it('should remove system', () => {
    let array: string[] = []
    const engine = Engine()
    function systemA() {
      array.push('A')
    }
    function systemB() {
      array.push('B')
    }
    function systemC() {
      array.push('C')
    }

    engine.addSystem(systemA, 200e3)
    engine.addSystem(systemB, 10, 'systemB')
    engine.addSystem(systemC)

    engine.update(0)
    expect(array).toStrictEqual(['A', 'C', 'B'])

    array = []
    expect(engine.removeSystem('systemB')).toBe(true)
    expect(engine.removeSystem('inexistingSystem')).toBe(false)

    engine.update(0)
    expect(array).toStrictEqual(['A', 'C'])

    array = []
    expect(engine.removeSystem(systemA)).toBe(true)
    engine.update(0)
    expect(array).toStrictEqual(['C'])
  })

  it('should remove the component after the update', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    engine.baseComponents.OnPointerDownResult.create(entity)
    engine.update(1 / 30)
    expect(engine.baseComponents.OnPointerDownResult.has(entity)).toBe(false)
  })

  it('should return the default component of the transform', () => {
    const engine = Engine()
    expect(TransformSchema.create()).toBeDeepCloseTo(
      engine.baseComponents.Transform.default()
    )
  })
})
