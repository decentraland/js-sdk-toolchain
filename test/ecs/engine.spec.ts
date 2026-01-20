import {
  cyclicParentingChecker,
  getComponentEntityTree,
  getEntitiesWithParent,
  getWorldPosition,
  getWorldRotation,
  MapResult,
  RESERVED_STATIC_ENTITIES
} from '../../packages/@dcl/ecs/src'
import { Engine, Entity, LastWriteWinElementSetComponentDefinition } from '../../packages/@dcl/ecs/src/engine'
import { createRendererTransport } from '../../packages/@dcl/sdk/src/internal/transports/rendererTransport'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { components } from '../../packages/@dcl/ecs/src'
import { Vector3, Quaternion } from '../../packages/@dcl/sdk/src/math'

const PositionSchema = {
  x: Schemas.Float
}

const VelocitySchema = {
  y: Schemas.Float
}

describe('Engine tests', () => {
  it('generates new entities', async () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    expect(entityA).toBe(RESERVED_STATIC_ENTITIES)
    expect(entityB).toBe(RESERVED_STATIC_ENTITIES + 1)
  })

  it('should not allow u to create same component to an existing entitiy', async () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    Position.create(entity, { x: 1 })
    expect(() => Position.create(entity, { x: 10 })).toThrowError()
  })

  it('should delete component if exists or not', async () => {
    const engine = Engine()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const entity = engine.addEntity()
    const entity2 = engine.addEntity()
    Position.create(entity, { x: 10 })
    expect(Position.deleteFrom(entity)).toStrictEqual({ x: 10 })
    expect(Position.deleteFrom(entity2)).toStrictEqual(null)
  })

  it('should fail when trying to add the same system twice', async () => {
    const engine = Engine()
    const system = () => {}
    engine.addSystem(system)
    expect(() => engine.addSystem(system)).toThrowError()

    const systemA = () => {}
    engine.addSystem(systemA)
    expect(() => engine.addSystem(systemA)).toThrowError()
  })

  it('should replace existing component with the new one', async () => {
    const engine = Engine()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const entity = engine.addEntity()
    Position.create(entity, { x: 1 })
    Position.createOrReplace(entity, { x: 10 })
    expect(Position.get(entity)).toStrictEqual({ x: 10 })
  })

  it('define and remove component, also creates new entity', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
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

    engine.removeComponentDefinition(888)
    expect(() => engine.getComponent(888)).toThrowError()

    engine.seal()
    expect(() => engine.removeComponentDefinition(888)).toThrowError(
      'Engine is already sealed. No components can be removed at this stage'
    )
  })

  it('should fail if we try to fetch a component not deifned', async () => {
    const engine = Engine()
    expect(() => engine.getComponent(1238)).toThrowError()
  })

  it('should return component by name', async () => {
    const engine = Engine()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    expect(engine.getComponent('PositionSchema').componentId).toBe(Position.componentId)
    expect(engine.getComponentOrNull('PositionSchema')!.componentId).toBe(Position.componentId)
  })

  it('iterate multiple components', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
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

  it('define two custom components multiple components without ids', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
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

  it('should not update a readonly prop', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    expect(Array.from(Position.dirtyIterator())).toEqual([])
    const posComponent = Position.create(entity, { x: 10 })
    posComponent.x = 1000000000000
    expect(Array.from(Position.dirtyIterator())).toEqual([entity])
    expect(Position.get(entity)).toStrictEqual({ x: 1000000000000 })
  })

  it('should not update a readonly prop groupOf', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const _posComponent = Position.create(entity, { x: 10 })
    for (const [_entity, position] of engine.getEntitiesWith(Position)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => (position.x = 1000000000000)).toThrowError()
    }
    expect(Position.get(entity)).toStrictEqual({ x: 10 })
  })

  it('should not update a readonly prop getFrom(entity)', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    Position.create(entity, { x: 10 })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const assignError = () => (Position.get(entity).x = 1000000000000)
    expect(assignError).toThrowError()
    expect(Position.get(entity)).toStrictEqual({ x: 10 })
  })

  it('should fail if we fetch a component that doesnt exists on an entity', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
    Position.create(entity, { x: 10 })
    expect(() => Velocity.get(entity)).toThrowError()
  })

  it('should return null if the component not exists on the entity.', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
    Position.create(entity, { x: 10 })
    expect(Velocity.getOrNull(entity)).toBe(null)
  })

  it.skip('should throw an error if the component class id already exists and the component definition is different', async () => {})

  it('should return exactly the same component trying to re-define it', async () => {
    const engine = Engine()
    const COMPONENT_ID = 'COMPONENT_ID'
    const a = engine.defineComponent(COMPONENT_ID, PositionSchema)
    const b = engine.defineComponent(COMPONENT_ID, PositionSchema)
    expect(a).toStrictEqual(b)
  })

  it('should return mutable obj if use component.getMutable()', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const COMPONENT_ID = 'COMPONENT_ID'
    const Position = engine.defineComponent(COMPONENT_ID, PositionSchema)
    Position.create(entity, { x: 10 })
    Position.getMutable(entity).x = 8888
    expect(Position.get(entity)).toStrictEqual({ x: 8888 })
  })

  it('should destroy an entity', async () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const entityB = engine.addEntity() // 0
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
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

  it('should return get entities with multiples components', async () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Position2 = engine.defineComponent('PositionSchema2', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
    Position.create(entityA, { x: 0 })
    Position2.create(entityA, { x: 8 })
    Velocity.create(entityA, { y: 1 })
    Velocity.create(entityB, { y: 1 })

    for (const [entity, readonlyVelocity, readonlyPosition, readonlyPosition2] of engine.getEntitiesWith(
      Velocity,
      Position,
      Position2
    )) {
      expect(entity).toBe(entityA)
      expect(readonlyVelocity).toStrictEqual({ y: 1 })
      expect(readonlyPosition).toStrictEqual({ x: 0 })
      expect(readonlyPosition2).toStrictEqual({ x: 8 })
    }
  })

  it('should return mutableGroupOf single component', async () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
    Position.create(entityA, { x: 0 })
    Velocity.create(entityA, { y: 1 })
    Velocity.create(entityB, { y: 10 })

    // avoid dirty iterators
    await engine.update(0)

    for (const [entity, _readonlyPosition] of engine.getEntitiesWith(Position)) {
      const position = Position.getMutable(entity)
      expect(entity).toBe(entityA)
      expect(position).toStrictEqual({ x: 0 })
      expect(Velocity.get(entity)).toStrictEqual({ y: 1 })
    }
    expect(Array.from(Velocity.dirtyIterator())).toEqual([])
    expect(Array.from(Position.dirtyIterator())).toEqual([entityA])
  })

  it('should return mutableGroupOf multi component & entities', async () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const entityC = engine.addEntity()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
    Position.create(entityA, { x: 0 })
    Position.create(entityB, { x: 1 })
    Position.create(entityC, { x: 2 })
    Velocity.create(entityA, { y: 0 })
    Velocity.create(entityB, { y: 1 })

    // avoid dirty iterators
    await engine.update(0)

    const [component1, component2, component3] = Array.from(engine.getEntitiesWith(Position, Velocity)).map(
      ([entity]) => [entity, Position.getMutable(entity), Velocity.getMutable(entity)]
    )

    expect(component1).toStrictEqual([entityA, { x: 0 }, { y: 0 }])
    expect(component2).toStrictEqual([entityB, { x: 1 }, { y: 1 }])
    expect(component3).toBe(undefined)
    expect(Array.from(Velocity.dirtyIterator())).toEqual([entityA, entityB])
    expect(Array.from(Position.dirtyIterator())).toEqual([entityA, entityB])
  })

  it('should return groupOf multi component & entities', async () => {
    const engine = Engine()
    const entityA = engine.addEntity()
    const entityB = engine.addEntity()
    const entityC = engine.addEntity()
    const Position = engine.defineComponent('PositionSchema', PositionSchema)
    const Velocity = engine.defineComponent('VelocitySchema', VelocitySchema)
    Position.create(entityA, { x: 0 })
    Position.create(entityB, { x: 1 })
    Position.create(entityC, { x: 2 })
    Velocity.create(entityA, { y: 0 })
    Velocity.create(entityB, { y: 1 })

    // avoid dirty iterators
    await engine.update(0)

    const [component1, component2, component3] = Array.from(engine.getEntitiesWith(Position, Velocity))
    expect(component1).toStrictEqual([entityA, { x: 0 }, { y: 0 }])
    expect(component2).toStrictEqual([entityB, { x: 1 }, { y: 1 }])
    expect(component3).toBe(undefined)
    expect(Array.from(Velocity.dirtyIterator())).toEqual([])
    expect(Array.from(Position.dirtyIterator())).toEqual([])
  })

  it('should return dirtyIterator.includes(entity)==true if we mutate the component', async () => {
    const engine = Engine()
    const MeshRenderer = components.MeshRenderer(engine)
    const entityA = engine.addEntity()
    MeshRenderer.create(entityA, {
      mesh: { $case: 'box', box: { uvs: [] } }
    })

    expect(Array.from(MeshRenderer.dirtyIterator()).includes(entityA)).toBe(true)
    await engine.update(1)
    expect(Array.from(MeshRenderer.dirtyIterator()).includes(entityA)).toBe(false)
    MeshRenderer.getMutable(entityA)
    expect(Array.from(MeshRenderer.dirtyIterator()).includes(entityA)).toBe(true)
  })

  // it('should fail to write to byte buffer if the entity not exists', async () => {
  //   const engine = Engine()
  //   const MeshRenderer = components.MeshRenderer(engine)
  //   const entityA = engine.addEntity()
  //   const buf = new ReadWriteByteBuffer()
  //   expect(() => MeshRenderer.writeToByteBuffer(entityA, buf)).toThrowError('')
  // })

  it('should remove component when using deleteFrom', async () => {
    const engine = Engine()
    const Transform = components.Transform(engine)
    const MoveTransportData = {
      duration: Schemas.Float,
      speed: Schemas.Float
    }
    engine.defineComponent('MoveTransportData', MoveTransportData)
    const zombie = engine.addEntity()

    const MoveTransformComponent = engine.defineComponent('MoveTransportData2', MoveTransportData)

    let moves = 0

    function moveSystem(_dt: number) {
      moves++
      for (const [entity, _readonlyMove] of engine.getEntitiesWith(MoveTransformComponent)) {
        const move = MoveTransformComponent.getMutable(entity)
        move.speed += 1
        Transform.getMutable(entity).position = Vector3.Zero()
        if (moves === 2) {
          MoveTransformComponent.deleteFrom(entity)
        }
      }
    }

    MoveTransformComponent.create(zombie, {
      duration: 10,
      speed: 1
    })

    Transform.create(zombie, {
      position: { x: 12, y: 1, z: 3 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    })

    engine.addSystem(moveSystem)

    expect(MoveTransformComponent.get(zombie)).toStrictEqual({
      duration: 10,
      speed: 1
    })
    await engine.update(1)
    expect(MoveTransformComponent.get(zombie)).toStrictEqual({
      speed: 2,
      duration: 10
    })
    await engine.update(1)
    expect(MoveTransformComponent.getOrNull(zombie)).toStrictEqual(null)
  })

  it('should remove Transform component and send it throught the network', async () => {
    const engine = Engine()
    const crdtSendToRenderer = jest.fn()
    engine.addTransport(createRendererTransport({ crdtSendToRenderer }))
    const entity = engine.addEntity()

    let moves = 0
    const Transform = components.Transform(engine)

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
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0 as Entity
    })
    await engine.update(1)
    expect(Transform.get(entity).position.x).toStrictEqual(13)
    await engine.update(1)
    expect(Transform.getOrNull(entity)).toStrictEqual(null)
    // TODO: assert crdtSendToRenderer called
  })

  it('should run in the order', async () => {
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

    await engine.update(0)
    expect(array).toStrictEqual(['A', 'C', 'B'])
  })

  it('should remove system', async () => {
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

    await engine.update(0)
    expect(array).toStrictEqual(['A', 'C', 'B'])

    array = []
    expect(engine.removeSystem('systemB')).toBe(true)
    expect(engine.removeSystem('inexistingSystem')).toBe(false)

    await engine.update(0)
    expect(array).toStrictEqual(['A', 'C'])

    array = []
    expect(engine.removeSystem(systemA)).toBe(true)
    await engine.update(0)
    expect(array).toStrictEqual(['C'])
  })

  it('should not remove the component after the update', async () => {
    // TODO: wtf is this test?
    const engine = Engine()
    const Transform = components.Transform(engine)
    Transform.create(engine.RootEntity, {})
    await engine.update(1 / 30)
    expect(Transform.has(engine.RootEntity)).toBe(true)
  })

  it('Component.create(entity) should equal Component.schema.create()', async () => {
    const engine = Engine()
    const Transform = components.Transform(engine)
    expect(Transform.create(engine.addEntity())).toBeDeepCloseTo(Transform.schema.create())
  })

  it('should log the error of cyclic parenting', async () => {
    const errorFunc = jest.spyOn(console, 'error')
    const errorString = (e: Entity) => 'There is a cyclic parent with entity ' + e

    const engine = Engine()
    const Transform = components.Transform(engine)
    const e0 = engine.addEntity()
    const e1 = engine.addEntity()
    const e2 = engine.addEntity()
    const e3 = engine.addEntity()

    engine.addSystem(cyclicParentingChecker(engine))

    Transform.create(e0)
    Transform.create(e1).parent = e0
    Transform.create(e2).parent = e1
    Transform.create(e3).parent = e2
    await engine.update(1 / 30)
    expect(errorFunc).not.toBeCalled()

    Transform.getMutable(e3).parent = e3
    await engine.update(1.0 / 30.0)
    expect(errorFunc).toBeCalledWith(errorString(e3))
    errorFunc.mock.calls = []

    Transform.getMutable(e3).parent = e2
    Transform.getMutable(e0).parent = e3
    await engine.update(1.0 / 30.0)
    expect(errorFunc.mock.calls.length).toBe(2)
    expect(errorFunc).toBeCalledTimes(2)
    expect(errorFunc).toBeCalledWith(errorString(e0))
  })

  it('should remove all children of a tree', async () => {
    const engine = Engine()
    const Transform = components.Transform(engine)
    const MeshCollider = components.MeshCollider(engine)
    // Cube factory
    function createCube(parent?: Entity): Entity {
      const meshEntity = engine.addEntity()
      Transform.create(meshEntity, {
        parent
      })
      MeshCollider.create(meshEntity, {
        mesh: { $case: 'box', box: {} }
      })
      return meshEntity
    }

    const e_A = createCube()
    const e_A1 = createCube(e_A)
    const e_A2 = createCube(e_A)
    const e_A3 = createCube(e_A)
    const e_A1_1 = createCube(e_A1)
    const e_A1_2 = createCube(e_A1)
    const e_A1_3 = createCube(e_A1)

    expect(MeshCollider.getOrNull(e_A1_3)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A1_2)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A1_1)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A2)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A3)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A)).not.toBeNull()

    engine.removeEntityWithChildren(e_A)

    expect(MeshCollider.getOrNull(e_A1_3)).toBeNull()
    expect(MeshCollider.getOrNull(e_A1_2)).toBeNull()
    expect(MeshCollider.getOrNull(e_A1_1)).toBeNull()
    expect(MeshCollider.getOrNull(e_A2)).toBeNull()
    expect(MeshCollider.getOrNull(e_A3)).toBeNull()
    expect(MeshCollider.getOrNull(e_A)).toBeNull()
  })

  it('should remove all children of a tree with recursive parenting', async () => {
    const engine = Engine()
    const Transform = components.Transform(engine)
    const MeshCollider = components.MeshCollider(engine)
    // Cube factory
    function createCube(parent?: Entity): Entity {
      const meshEntity = engine.addEntity()
      Transform.create(meshEntity, {
        parent
      })
      MeshCollider.create(meshEntity, {
        mesh: { $case: 'box', box: {} }
      })
      return meshEntity
    }

    const e_A = createCube()
    const e_A1 = createCube(e_A)
    const e_A2 = createCube(e_A)
    const e_A3 = createCube(e_A)
    const e_A1_1 = createCube(e_A1)
    const e_A1_2 = createCube(e_A1)
    const e_A1_3 = createCube(e_A1)

    const e_recursive = createCube(e_A1)
    Transform.getMutable(e_A).parent = e_recursive

    expect(MeshCollider.getOrNull(e_A1_3)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A1_2)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A1_1)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A2)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A3)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_A)).not.toBeNull()
    expect(MeshCollider.getOrNull(e_recursive)).not.toBeNull()

    engine.removeEntityWithChildren(e_A)

    expect(MeshCollider.getOrNull(e_A1_3)).toBeNull()
    expect(MeshCollider.getOrNull(e_A1_2)).toBeNull()
    expect(MeshCollider.getOrNull(e_A1_1)).toBeNull()
    expect(MeshCollider.getOrNull(e_A2)).toBeNull()
    expect(MeshCollider.getOrNull(e_A3)).toBeNull()
    expect(MeshCollider.getOrNull(e_A)).toBeNull()
    expect(MeshCollider.getOrNull(e_recursive)).toBeNull()
  })

  it('should return all entities as a tree (or the provided entity if there is no valid tree)', () => {
    const engine = Engine()
    const Transform = components.Transform(engine)
    const MeshCollider = components.MeshCollider(engine)
    const TreeComponent = engine.defineComponent('test::TreeComponent', {
      parent: Schemas.Entity
    })
    function createCube(parent?: Entity): Entity {
      const entity = engine.addEntity()
      MeshCollider.create(entity, {
        mesh: { $case: 'box', box: {} }
      })
      TreeComponent.create(entity, { parent })
      return entity
    }

    const e_A = createCube()
    const e_A1 = createCube(e_A)
    const e_A2 = createCube(e_A)
    const e_A3 = createCube(e_A)
    const e_A1_1 = createCube(e_A1)
    const e_A1_2 = createCube(e_A1)
    const e_A1_3 = createCube(e_A1)

    const entitiesWithValidComponent = Array.from(getComponentEntityTree(engine, e_A, TreeComponent))
    const entitiesWithInvalidComponent = Array.from(getComponentEntityTree(engine, e_A, MeshCollider))
    const noEntitiesWithComponent = Array.from(getComponentEntityTree(engine, e_A, Transform))

    expect(entitiesWithValidComponent).toEqual(expect.arrayContaining([e_A, e_A1, e_A2, e_A3, e_A1_1, e_A1_2, e_A1_3]))
    expect(entitiesWithInvalidComponent).toEqual([e_A])
    expect(noEntitiesWithComponent).toEqual([])
  })

  it('should return all direct children of a parent entity', () => {
    const engine = Engine()
    const Transform = components.Transform(engine)

    // Create parent
    const parent = engine.addEntity()
    Transform.create(parent, {})

    // Create direct children
    const child1 = engine.addEntity()
    const child2 = engine.addEntity()
    const child3 = engine.addEntity()
    Transform.create(child1, { parent })
    Transform.create(child2, { parent })
    Transform.create(child3, { parent })

    // Create grandchild (should NOT be included)
    const grandchild = engine.addEntity()
    Transform.create(grandchild, { parent: child1 })

    // Create unrelated entity
    const unrelated = engine.addEntity()
    Transform.create(unrelated, {})

    const children = getEntitiesWithParent(engine, parent)

    expect(children).toHaveLength(3)
    expect(children).toContain(child1)
    expect(children).toContain(child2)
    expect(children).toContain(child3)
    expect(children).not.toContain(grandchild)
    expect(children).not.toContain(unrelated)
  })

  describe('getWorldPosition', () => {
    it('should return zero vector for entity without Transform', () => {
      const engine = Engine()
      const entity = engine.addEntity()

      const worldPos = getWorldPosition(engine, entity)

      expect(worldPos).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('should return local position for entity without parent', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)
      const entity = engine.addEntity()
      Transform.create(entity, { position: { x: 5, y: 10, z: 15 } })

      const worldPos = getWorldPosition(engine, entity)

      expect(worldPos).toEqual({ x: 5, y: 10, z: 15 })
    })

    it('should compute world position with single parent (translation only)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const parent = engine.addEntity()
      Transform.create(parent, { position: { x: 10, y: 0, z: 0 } })

      const child = engine.addEntity()
      Transform.create(child, { position: { x: 5, y: 0, z: 0 }, parent })

      const worldPos = getWorldPosition(engine, child)

      expect(worldPos).toEqual({ x: 15, y: 0, z: 0 })
    })

    it('should compute world position with multi-level hierarchy (translation only)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const grandparent = engine.addEntity()
      Transform.create(grandparent, { position: { x: 100, y: 0, z: 0 } })

      const parent = engine.addEntity()
      Transform.create(parent, { position: { x: 10, y: 0, z: 0 }, parent: grandparent })

      const child = engine.addEntity()
      Transform.create(child, { position: { x: 1, y: 0, z: 0 }, parent })

      const worldPos = getWorldPosition(engine, child)

      expect(worldPos).toEqual({ x: 111, y: 0, z: 0 })
    })

    it('should compute world position with parent scale', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const parent = engine.addEntity()
      Transform.create(parent, {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 2, z: 2 }
      })

      const child = engine.addEntity()
      Transform.create(child, { position: { x: 5, y: 0, z: 0 }, parent })

      const worldPos = getWorldPosition(engine, child)

      // Child at local (5, 0, 0) with parent scale 2x should be at (10, 0, 0)
      expect(worldPos).toEqual({ x: 10, y: 0, z: 0 })
    })

    it('should compute world position with parent rotation (90 degrees around Y)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const parent = engine.addEntity()
      // Rotate 90 degrees around Y axis
      Transform.create(parent, {
        position: { x: 0, y: 0, z: 0 },
        rotation: Quaternion.fromEulerDegrees(0, 90, 0)
      })

      const child = engine.addEntity()
      Transform.create(child, { position: { x: 1, y: 0, z: 0 }, parent })

      const worldPos = getWorldPosition(engine, child)

      // A point at (1, 0, 0) rotated 90 degrees around Y should be at (0, 0, -1)
      expect(worldPos.x).toBeCloseTo(0, 5)
      expect(worldPos.y).toBeCloseTo(0, 5)
      expect(worldPos.z).toBeCloseTo(-1, 5)
    })

    it('should compute world position with parent rotation and scale combined', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const parent = engine.addEntity()
      Transform.create(parent, {
        position: { x: 10, y: 0, z: 0 },
        rotation: Quaternion.fromEulerDegrees(0, 90, 0),
        scale: { x: 2, y: 1, z: 1 }
      })

      const child = engine.addEntity()
      Transform.create(child, { position: { x: 5, y: 0, z: 0 }, parent })

      const worldPos = getWorldPosition(engine, child)

      // Child at local (5, 0, 0) scaled by (2, 1, 1) = (10, 0, 0)
      // Then rotated 90 degrees around Y = (0, 0, -10)
      // Then translated by parent position (10, 0, 0) = (10, 0, -10)
      expect(worldPos.x).toBeCloseTo(10, 5)
      expect(worldPos.y).toBeCloseTo(0, 5)
      expect(worldPos.z).toBeCloseTo(-10, 5)
    })
  })

  describe('getWorldPosition circular dependency detection', () => {
    it('should throw error for direct self-reference (A -> A)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const entityA = engine.addEntity()
      Transform.create(entityA, {
        position: { x: 1, y: 0, z: 0 },
        parent: entityA // Self-reference
      })

      expect(() => getWorldPosition(engine, entityA)).toThrow(/Circular dependency detected/)
    })

    it('should throw error for two-entity cycle (A -> B -> A)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const entityA = engine.addEntity()
      const entityB = engine.addEntity()

      Transform.create(entityA, {
        position: { x: 1, y: 0, z: 0 },
        parent: entityB
      })
      Transform.create(entityB, {
        position: { x: 2, y: 0, z: 0 },
        parent: entityA
      })

      expect(() => getWorldPosition(engine, entityA)).toThrow(/Circular dependency detected/)
      expect(() => getWorldPosition(engine, entityB)).toThrow(/Circular dependency detected/)
    })

    it('should throw error for three-entity cycle (A -> B -> C -> A)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const entityA = engine.addEntity()
      const entityB = engine.addEntity()
      const entityC = engine.addEntity()

      Transform.create(entityA, {
        position: { x: 1, y: 0, z: 0 },
        parent: entityB
      })
      Transform.create(entityB, {
        position: { x: 2, y: 0, z: 0 },
        parent: entityC
      })
      Transform.create(entityC, {
        position: { x: 3, y: 0, z: 0 },
        parent: entityA
      })

      expect(() => getWorldPosition(engine, entityA)).toThrow(/Circular dependency detected/)
      expect(() => getWorldPosition(engine, entityB)).toThrow(/Circular dependency detected/)
      expect(() => getWorldPosition(engine, entityC)).toThrow(/Circular dependency detected/)
    })

    it('should work correctly with valid deep hierarchy (no cycle)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const root = engine.addEntity()
      const level1 = engine.addEntity()
      const level2 = engine.addEntity()
      const level3 = engine.addEntity()
      const level4 = engine.addEntity()

      Transform.create(root, { position: { x: 1, y: 0, z: 0 } })
      Transform.create(level1, { position: { x: 1, y: 0, z: 0 }, parent: root })
      Transform.create(level2, { position: { x: 1, y: 0, z: 0 }, parent: level1 })
      Transform.create(level3, { position: { x: 1, y: 0, z: 0 }, parent: level2 })
      Transform.create(level4, { position: { x: 1, y: 0, z: 0 }, parent: level3 })

      // Should not throw and should correctly accumulate positions
      const worldPos = getWorldPosition(engine, level4)
      expect(worldPos).toEqual({ x: 5, y: 0, z: 0 })
    })
  })

  describe('getWorldRotation circular dependency detection', () => {
    it('should throw error for direct self-reference (A -> A)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const entityA = engine.addEntity()
      Transform.create(entityA, {
        rotation: Quaternion.fromEulerDegrees(0, 45, 0),
        parent: entityA // Self-reference
      })

      expect(() => getWorldRotation(engine, entityA)).toThrow(/Circular dependency detected/)
    })

    it('should throw error for two-entity cycle (A -> B -> A)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const entityA = engine.addEntity()
      const entityB = engine.addEntity()

      Transform.create(entityA, {
        rotation: Quaternion.fromEulerDegrees(0, 45, 0),
        parent: entityB
      })
      Transform.create(entityB, {
        rotation: Quaternion.fromEulerDegrees(0, 45, 0),
        parent: entityA
      })

      expect(() => getWorldRotation(engine, entityA)).toThrow(/Circular dependency detected/)
      expect(() => getWorldRotation(engine, entityB)).toThrow(/Circular dependency detected/)
    })

    it('should work correctly with valid deep hierarchy (no cycle)', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const root = engine.addEntity()
      const level1 = engine.addEntity()
      const level2 = engine.addEntity()
      const level3 = engine.addEntity()

      Transform.create(root, { rotation: Quaternion.fromEulerDegrees(0, 30, 0) })
      Transform.create(level1, { rotation: Quaternion.fromEulerDegrees(0, 30, 0), parent: root })
      Transform.create(level2, { rotation: Quaternion.fromEulerDegrees(0, 30, 0), parent: level1 })
      Transform.create(level3, { rotation: Quaternion.fromEulerDegrees(0, 30, 0), parent: level2 })

      // Should not throw and should correctly combine rotations (4 x 30 = 120 degrees)
      const worldRot = getWorldRotation(engine, level3)
      const expected = Quaternion.fromEulerDegrees(0, 120, 0)
      expect(worldRot.x).toBeCloseTo(expected.x, 5)
      expect(worldRot.y).toBeCloseTo(expected.y, 5)
      expect(worldRot.z).toBeCloseTo(expected.z, 5)
      expect(worldRot.w).toBeCloseTo(expected.w, 5)
    })
  })

  describe('getWorldRotation', () => {
    it('should return identity quaternion for entity without Transform', () => {
      const engine = Engine()
      const entity = engine.addEntity()

      const worldRot = getWorldRotation(engine, entity)

      expect(worldRot).toEqual({ x: 0, y: 0, z: 0, w: 1 })
    })

    it('should return local rotation for entity without parent', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)
      const entity = engine.addEntity()
      const rotation = Quaternion.fromEulerDegrees(0, 45, 0)
      Transform.create(entity, { rotation })

      const worldRot = getWorldRotation(engine, entity)

      expect(worldRot.x).toBeCloseTo(rotation.x, 5)
      expect(worldRot.y).toBeCloseTo(rotation.y, 5)
      expect(worldRot.z).toBeCloseTo(rotation.z, 5)
      expect(worldRot.w).toBeCloseTo(rotation.w, 5)
    })

    it('should combine rotations in parent hierarchy', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const parent = engine.addEntity()
      Transform.create(parent, {
        rotation: Quaternion.fromEulerDegrees(0, 45, 0)
      })

      const child = engine.addEntity()
      Transform.create(child, {
        rotation: Quaternion.fromEulerDegrees(0, 45, 0),
        parent
      })

      const worldRot = getWorldRotation(engine, child)

      // Two 45-degree rotations around Y should equal 90 degrees
      const expected = Quaternion.fromEulerDegrees(0, 90, 0)
      expect(worldRot.x).toBeCloseTo(expected.x, 5)
      expect(worldRot.y).toBeCloseTo(expected.y, 5)
      expect(worldRot.z).toBeCloseTo(expected.z, 5)
      expect(worldRot.w).toBeCloseTo(expected.w, 5)
    })

    it('should combine rotations in multi-level hierarchy', () => {
      const engine = Engine()
      const Transform = components.Transform(engine)

      const grandparent = engine.addEntity()
      Transform.create(grandparent, {
        rotation: Quaternion.fromEulerDegrees(0, 30, 0)
      })

      const parent = engine.addEntity()
      Transform.create(parent, {
        rotation: Quaternion.fromEulerDegrees(0, 30, 0),
        parent: grandparent
      })

      const child = engine.addEntity()
      Transform.create(child, {
        rotation: Quaternion.fromEulerDegrees(0, 30, 0),
        parent
      })

      const worldRot = getWorldRotation(engine, child)

      // Three 30-degree rotations around Y should equal 90 degrees
      const expected = Quaternion.fromEulerDegrees(0, 90, 0)
      expect(worldRot.x).toBeCloseTo(expected.x, 5)
      expect(worldRot.y).toBeCloseTo(expected.y, 5)
      expect(worldRot.z).toBeCloseTo(expected.z, 5)
      expect(worldRot.w).toBeCloseTo(expected.w, 5)
    })
  })

  it('should throw an error if the system is a thenable', async () => {
    const engine = Engine()
    engine.addSystem(async function () {
      return new Promise((resolve) => setTimeout(resolve, 0))
    })
    const previousDebugMode = globalThis.DEBUG
    globalThis.DEBUG = true
    await expect(engine.update(1)).rejects.toThrowError()

    if (previousDebugMode) {
      globalThis.DEBUG = previousDebugMode
    } else {
      delete globalThis.DEBUG
    }
  })

  it('should throw an error adding components after seal', async () => {
    const engine = Engine()

    engine.defineComponent('comp1', {})
    engine.defineComponent('comp2', {})
    engine.seal()

    expect(() => {
      engine.defineComponent('comp3', {})
    }).toThrowError()
  })

  it('should throw an error if the system is added twice', async () => {
    const engine = Engine()
    function testSystem() {}
    engine.addSystem(testSystem)

    expect(() => {
      engine.addSystem(testSystem)
    }).toThrowError()
  })

  it('define and remove component from component name', async () => {
    const engine = Engine()
    engine.defineComponent('PositionSchema', PositionSchema)

    const Position = engine.getComponent('PositionSchema') as LastWriteWinElementSetComponentDefinition<
      MapResult<typeof PositionSchema>
    >
    expect(Position).not.toBeNull()

    engine.removeComponentDefinition('PositionSchema')
    expect(() => engine.getComponent('PositionSchema')).toThrowError()
  })

  describe('should return mutable obj if use component.getOrCreateMutable()', () => {
    const engine = Engine()
    const COMPONENT_ID = 'COMPONENT_ID'
    const Position = engine.defineComponent(COMPONENT_ID, PositionSchema)

    it('with existing component', async () => {
      const entity = engine.addEntity()
      Position.create(entity, { x: 10 })
      expect(Position.getOrCreateMutable(entity)).toStrictEqual({ x: 10 })
    })

    it('with non-existing component', async () => {
      const entity = engine.addEntity()
      expect(Position.getOrCreateMutable(entity, { x: 12 })).toStrictEqual({ x: 12 })
    })
  })
})
