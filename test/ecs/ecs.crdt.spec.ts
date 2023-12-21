import {
  components,
  CrdtMessageType,
  DeleteComponent,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  Schemas
} from '../../packages/@dcl/ecs/src'
import { PutComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt'
import { Entity, EntityState, EntityUtils, RESERVED_STATIC_ENTITIES } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Vector3 } from '../../packages/@dcl/sdk/src/math'
import { SandBox, wait } from './utils'

async function simpleScene(engine: IEngine) {
  const Transform = components.Transform(engine)
  const MeshRenderer = components.MeshRenderer(engine)
  const PointerEventsResult = components.PointerEventsResult(engine)

  const entityA = engine.addEntity()
  Transform.create(entityA, { position: Vector3.One() })
  MeshRenderer.setBox(entityA)

  for (let i = 0; i < 10; i++) {
    Transform.getMutable(entityA).position.x += 10
  }

  MeshRenderer.setCylinder(entityA)

  PointerEventsResult.addValue(entityA, PointerEventsResult.schema.create())

  await engine.update(1)

  const tenEntities: Entity[] = []
  for (let i = 0; i < 10; i++) {
    const entity = engine.addEntity()
    MeshRenderer.setSphere(entity)
    Transform.create(entity, { scale: Vector3.create(i, i, i) })
    tenEntities.push(entity)
  }

  engine.removeEntity(entityA)

  const newEntity = engine.addEntity()
  Transform.create(newEntity, { position: Vector3.Left() })
  MeshRenderer.setPlane(newEntity)

  // Until this point it shouldn't reuse any entity
  await engine.update(1)

  const entityShouldReused = engine.addEntity()
  Transform.create(entityShouldReused, { position: Vector3.Right() })
  MeshRenderer.setPlane(entityShouldReused)

  await engine.update(1)

  PointerEventsResult.addValue(entityShouldReused, PointerEventsResult.schema.create())

  await engine.update(1)

  engine.removeEntity(tenEntities[0])
  engine.removeEntity(tenEntities[1])
  engine.removeEntity(tenEntities[2])

  await engine.update(1)

  // TODO(Mendez):
  //       Add a test to ensure that modification of already deleted entities throws an error in devmode
  //       and passthrough in prd mode. It took me two hours to figure that this test is doing nonsense!
  //       Comparing the final states of each engine of course diverged, because we are
  //       trying to update an entity that was already deleted. Thus, the CRDT protocol
  //       ignored its messages.

  // // These two line shouldn't has effect in the final state, entityA has already deleted
  // Transform.create(entityA, { position: Vector3.Left() })
  // MeshRenderer.setPlane(entityA)

  // await engine.update(1)
}

describe('CRDT tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  it('should send static entities', async () => {
    const { engine, spySend } = SandBox.create({ length: 1 })[0]
    const entityA = engine.addEntity()
    const Transform = components.Transform(engine)
    const Test = engine.getComponent(SandBox.Position.id) as LastWriteWinElementSetComponentDefinition<Partial<Vector3>>

    // Create two basic components for entity A
    Transform.create(entityA, SandBox.DEFAULT_POSITION)
    Test.create(entityA, { x: 1, y: 2 })

    // Tick update and verify that both messages are being sent through ws.send
    await engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(1)

    // Reset ws.send called times
    jest.resetAllMocks()

    Transform.getMutable(entityA).position.x = 10
    await engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(1)
  })

  it('Send ONLY dirty components via trasnport and spy on send messages', async () => {
    const { engine, spySend } = SandBox.create({ length: 1 })[0]
    const entityA = engine.addEntity()
    const Transform = components.Transform(engine)
    const Test = engine.getComponent(SandBox.Position.id) as LastWriteWinElementSetComponentDefinition<Partial<Vector3>>

    // Create two basic components for entity A
    Transform.create(entityA, SandBox.DEFAULT_POSITION)
    Test.create(entityA, { x: 1, y: 2 })

    // Tick update and verify that both messages are being sent through ws.send
    await engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(1)

    // Reset ws.send called times
    jest.resetAllMocks()

    // Update a component and verify that's being sent through the crdt system
    Transform.getMutable(entityA).position.x = 10
    await engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(1)

    // Reset ws.send again
    jest.resetAllMocks()

    // Call update again with no updates and verify that there's no message
    // being sent through the wire
    await engine.update(1 / 30)
    expect(spySend).toBeCalledWith(new Uint8Array([]))
  })

  it('should sent new entity through the wire and process it in the other engine', async () => {
    const [clientA, clientB] = SandBox.create({ length: 2 })

    const entityA = clientA.engine.addEntity()
    const TransformA = components.Transform(clientA.engine)
    const TransformB = components.Transform(clientB.engine)
    const PositionA = clientA.components.Position
    const PositionB = clientB.components.Position

    // Create two components for a dynamic entity.
    TransformA.create(entityA, SandBox.DEFAULT_POSITION)
    const posA = PositionA.create(entityA, { x: 10.231231, y: 0.12321321312 })

    await clientA.engine.update(1 / 30)
    expect(PositionB.has(entityA)).toBe(false)

    expect(clientB.operations).toBeDeepCloseTo([])

    // Update engine, process crdt messages.
    await wait(SandBox.WS_SEND_DELAY)
    await clientB.engine.update(1 / 30)

    const entityB = clientB.engine.addEntity()
    expect(entityB).toBe(entityA + 1)

    expect(SandBox.DEFAULT_POSITION).toBeDeepCloseTo(TransformB.get(entityA))
    expect(posA).toBeDeepCloseTo(PositionB.get(entityA))
    expect(clientA.spySend).toBeCalledTimes(1)
    expect(clientB.spySend).toBeCalledTimes(1)

    expect(clientA.operations).toBeDeepCloseTo([
      { entity: entityA, value: SandBox.DEFAULT_POSITION },
      { entity: entityA, value: { x: 10.231231, y: 0.12321321312 } }
    ])
    expect(clientB.operations).toBeDeepCloseTo([
      { entity: entityA, value: SandBox.DEFAULT_POSITION },
      { entity: entityA, value: { x: 10.231231, y: 0.12321321312 } }
    ])
  })

  it('create multiple clients with the same code. Just like a scene', async () => {
    const CLIENT_LENGTH = 6
    const UPDATE_MS = 100
    const DOOR_VALUE = 8
    const clients = SandBox.create({ length: CLIENT_LENGTH })

    const interval = setInterval(() => {
      clients.forEach((c) => c.engine.update(1))
    }, UPDATE_MS)

    clients.forEach(({ engine }) => {
      const PosCompomnent = engine.getComponent(
        SandBox.Position.id
      ) as LastWriteWinElementSetComponentDefinition<Vector3>
      const DoorComponent = engine.getComponent(SandBox.Door.id) as LastWriteWinElementSetComponentDefinition<{
        open: number
      }>
      const entity = engine.addEntity()

      components.Transform(engine).create(entity, SandBox.DEFAULT_POSITION)
      PosCompomnent.create(entity, Vector3.Up())
      DoorComponent.create(entity, { open: 1 })
    })

    clients.forEach((c) => expect(c.spySend).toBeCalledTimes(0))
    /**
     * If we change a static entity in one scene. It should be send to other peers.
     */
    const [clientA, ...otherClients] = clients
    const TransformA = components.Transform(clientA.engine)
    const DoorComponent = clientA.components.Door
    // Upate Transform from static entity
    const entity = ((clientA.engine.addEntity() as number) - 1) as Entity
    TransformA.getMutable(entity).position.x = 10

    // Create a dynamic entity
    const dynamicEntity = clientA.engine.addEntity()
    DoorComponent.create(dynamicEntity, { open: 1 })
    const randomGuyWin = (Math.random() * CLIENT_LENGTH - 1) | 0
    otherClients.forEach(({ engine, components }, index) => {
      const DoorComponent = components.Door
      const isRandomGuy = randomGuyWin === index

      function doorSystem(_dt: number) {
        for (const [entity, _readOnlyDoor] of engine.getEntitiesWith(DoorComponent)) {
          DoorComponent.getMutable(entity).open = isRandomGuy ? DOOR_VALUE : Math.max(Math.random(), DOOR_VALUE) // Some random value < DOOR_VALUE
        }
      }
      engine.addSystem(doorSystem)
    })

    // Wait for the updates
    await wait(UPDATE_MS * 4)
    clearInterval(interval)
    await wait(UPDATE_MS)

    clients.forEach(({ components }) => {
      const doorValue = components.Door.get(dynamicEntity).open
      expect(doorValue).toBe(DOOR_VALUE)
    })
  })

  it('getMutable fails for inexistent entity', async () => {
    const [{ engine }] = SandBox.create({ length: 1 })
    const Transform = components.Transform(engine)
    expect(() => Transform.getMutable(123 as Entity)).toThrow()
  })

  it('should not resend a crdt message if its outdated', async () => {
    const [{ engine, transports, spySend }] = SandBox.create({ length: 1 })
    const entity = engine.addEntity()
    const Transform = components.Transform(engine)
    Transform.create(entity, SandBox.DEFAULT_POSITION)
    await engine.update(1)
    Transform.getMutable(entity).position.x = 8
    await engine.update(1)
    const buffer = new ReadWriteByteBuffer()
    const tmpBuffer1 = new ReadWriteByteBuffer()
    Transform.schema.serialize(Transform.get(entity), tmpBuffer1)
    PutComponentOperation.write(entity, 0, Transform.componentId, tmpBuffer1.toBinary(), buffer)
    jest.resetAllMocks()
    transports[0].onmessage!(buffer.toBinary())
    await engine.update(1)

    expect(spySend).toBeCalledWith(new Uint8Array([]))
  })

  it('should remove a component if we receive a DELETE_COMPONENT operation message', async () => {
    const [{ engine, transports }] = SandBox.create({ length: 1 })
    const [transport] = transports
    const entity = engine.addEntity()
    const Transform = components.Transform(engine)

    Transform.create(entity, SandBox.DEFAULT_POSITION)
    await engine.update(1)

    const buffer = new ReadWriteByteBuffer()
    DeleteComponent.write(entity, Transform.componentId, 2, buffer)
    transport.onmessage!(buffer.toBinary())
    await engine.update(1)
    expect(Transform.getOrNull(entity)).toBe(null)
  })

  it('should process messages even if the component is not found', async () => {
    const [{ engine }, { engine: serverEngine, transports }] = SandBox.create({
      length: 2
    })
    const [serverTransport] = transports
    const entity = engine.addEntity()
    const customComponent = engine.defineComponent('custom component', {
      open: Schemas.Boolean
    })
    const customServerComponent = serverEngine.defineComponent('custom component', {
      open: Schemas.Boolean
    })
    customComponent.create(entity, { open: false })
    await engine.update(1)

    const buffer = new ReadWriteByteBuffer()
    const buffer2 = new ReadWriteByteBuffer()
    customComponent.schema.serialize(customComponent.get(entity), buffer2)
    PutComponentOperation.write(entity, 1, customComponent.componentId, buffer2.toBinary(), buffer)
    serverTransport.onmessage!(buffer.toBinary())
    await serverEngine.update(1)
    expect(customServerComponent.get(entity)).toEqual(customComponent.get(entity))
  })

  it('should converge to the same final state (a simple transform creation)', async () => {
    const {
      clients: [clientA, clientB, clientC]
    } = SandBox.createEngines({ length: 3 })

    const entityA = clientA.engine.addEntity()
    clientA.Transform.create(entityA, { position: Vector3.One() })

    // before the update, the crdt state is out-to-date
    expect(() => compareStatePayloads({ clientA, clientB, clientC })).toThrow()

    await clientA.engine.update(1)

    // now, the crdt state and engine should converge
    expect(() => compareStatePayloads({ clientA, clientB, clientC })).toThrow()

    // between clients, ClientA hasn't sent anything yet, so, crdt state won't be synched
    clientA.flushOutgoing()

    await clientB.engine.update(1)
    await clientC.engine.update(1)

    // now, it should be all synched
    compareStatePayloads({ clientA, clientB, clientC })
  })

  it('should ignore invalid message type', async () => {
    const {
      clients: [clientA]
    } = SandBox.createEngines({ length: 1 })

    const buf = new ReadWriteByteBuffer()
    buf.writeUint32(8)
    buf.writeUint32(0x83294732)

    clientA.transports[0].onmessage!(buf.toBinary()!)

    const stateBeforeProcessMessage = serializeEngine(clientA.engine)
    await clientA.engine.update(1)
    expect(serializeEngine(clientA.engine)).toBe(stateBeforeProcessMessage)
  })

  it('should converge to the same final state (more complex scene code)', async () => {
    const {
      clients: [clientA, clientB, clientC]
    } = SandBox.createEngines({ length: 3 })

    // runs a kind of scene in the clientA
    await simpleScene(clientA.engine)

    // sends all its updates
    clientA.flushOutgoing()

    // all engine run their tick
    await clientA.engine.update(1)
    await clientB.engine.update(1)
    await clientC.engine.update(1)

    const entityShouldBeDeleted = 512 as Entity
    expect(clientA.engine.entityContainer.getEntityState(entityShouldBeDeleted)).toEqual(EntityState.Removed)
    expect(clientB.engine.entityContainer.getEntityState(entityShouldBeDeleted)).toEqual(EntityState.Removed)
    expect(clientC.engine.entityContainer.getEntityState(entityShouldBeDeleted)).toEqual(EntityState.Removed)

    // now, it should be all synched
    compareStatePayloads({ clientB, clientC, clientA })
  })

  describe(`should converge to the same final state (more complex scene code) (shuffle messages)`, () => {
    const shuffleSeeds = [283945239, 219, 1, 8239423, 19230]
    shuffleSeeds.forEach((seedValue) => {
      it(`shuffle with seed ${seedValue}`, async () => {
        const {
          clients: [clientA, clientB, clientC]
        } = SandBox.createEngines({ length: 3 })

        await simpleScene(clientA.engine)

        // same as previous test, now I shuffle the messages
        clientA.shuffleOutgoingMessages(seedValue)
        clientA.flushOutgoing()

        await clientA.engine.update(1)
        await clientB.engine.update(1)
        await clientC.engine.update(1)

        // now, it should be all synched
        compareStatePayloads({ clientA, clientB, clientC })
      })

      it(`shuffle messages with seed ${seedValue}, and with multiple scene runs`, async () => {
        const {
          clients: [clientA, clientB, clientC]
        } = SandBox.createEngines({ length: 3 })

        // same as previous test, but all the clients run the same scene
        await simpleScene(clientA.engine)
        await simpleScene(clientB.engine)
        await simpleScene(clientC.engine)

        // same as previous test, now I shuffle the messages of each client
        clientA.shuffleOutgoingMessages(seedValue + 342358924)
        clientA.flushOutgoing()

        clientB.shuffleOutgoingMessages(seedValue + 87683272)
        clientB.flushOutgoing()

        clientC.shuffleOutgoingMessages(seedValue + 178698447)
        clientC.flushOutgoing()

        await clientA.engine.update(1)
        await clientB.engine.update(1)
        await clientC.engine.update(1)

        // now, it should be all synched
        compareStatePayloads({ clientA, clientB, clientC })
      })
    })
  })

  it('should receive an update from a version greater', async () => {
    const {
      clients: [clientA, clientB, clientC],
      flushCrdtAndSynchronize
    } = SandBox.createEngines({ length: 3 })

    for (let i = 0; i < 30; i++) {
      clientA.engine.removeEntity(clientA.engine.addEntity())
      await clientA.engine.update(1)
    }

    const entity = clientA.engine.addEntity()
    expect(entity).toBe(EntityUtils.toEntityId(RESERVED_STATIC_ENTITIES, 30))
    clientA.Transform.create(entity, { position: Vector3.create() })
    await clientA.engine.update(1)

    const entityB = clientB.engine.addEntity()
    clientB.Transform.create(entityB)
    await clientB.engine.update(1)
    clientB.flushOutgoing()

    await clientA.engine.update(1)

    await flushCrdtAndSynchronize()

    compareStatePayloads({ clientA, clientB, clientC })

    expect(
      clientB.operations.includes({
        entity: 512 as Entity,
        operation: CrdtMessageType.DELETE_ENTITY,
        value: undefined
      })
    )
  })

  it('should delete many entities', async () => {
    const {
      clients: [clientA, clientB, clientC],
      flushCrdtAndSynchronize
    } = SandBox.createEngines({ length: 3 })

    const cube = clientA.engine.addEntity()
    clientA.Transform.create(cube)

    const entitiesCalledToBeRemoved: Entity[] = []
    let prevEntity: Entity | null = null
    function system() {
      if (prevEntity) {
        entitiesCalledToBeRemoved.push(prevEntity)
        clientA.engine.removeEntity(prevEntity)
      }
      prevEntity = clientA.engine.addEntity()
      clientA.MeshRenderer.setBox(prevEntity)
    }

    clientA.engine.addSystem(system, 0, 'test-system')

    for (let i = 0; i < 10; i++) {
      await clientA.engine.update(1)
      clientA.flushOutgoing()
    }

    clientA.engine.removeSystem('test-system')
    await clientA.engine.update(1)

    await flushCrdtAndSynchronize()

    compareStatePayloads({ clientA, clientB, clientC })

    for (const e of entitiesCalledToBeRemoved) {
      expect(clientA.engine.entityContainer.getEntityState(e)).toEqual(EntityState.Removed)
      expect(clientB.engine.entityContainer.getEntityState(e)).toEqual(EntityState.Removed)
      expect(clientC.engine.entityContainer.getEntityState(e)).toEqual(EntityState.Removed)
    }
  })
})

// Spec http://www.ecma-international.org/ecma-262/6.0/#sec-json.stringify
const replacer = (key: string, value: any) =>
  value instanceof Object && !(value instanceof Array)
    ? Object.keys(value)
        .sort()
        .reduce((sorted: any, key) => {
          sorted[key] = value[key]
          return sorted
        }, {})
    : value

function getEngineState(engine: IEngine) {
  const entities: Map<Entity, Record<string, any>> = new Map()

  function ensureEntityExists(entity: Entity) {
    if (!entities.has(entity)) entities.set(entity, {})
    return entities.get(entity)!
  }

  for (const component of engine.componentsIter()) {
    for (const [entity, componentValue] of component.iterator()) {
      const data = ensureEntityExists(entity)
      data[component.componentName] = componentValue
    }
  }

  return entities
}

function serializeEngine(engine: IEngine) {
  const out: string[] = []
  function entityKey(entity: Entity): string {
    return JSON.stringify('0x' + entity.toString(16))
  }

  const entities = getEngineState(engine)

  const sortedByEntity = Array.from(entities.entries()).sort((a, b) => {
    return a[0] > b[0] ? 1 : 0
  })

  for (const [entity, components] of sortedByEntity) {
    out.push(entityKey(entity) + ':')

    // print sorted components
    for (const componentName of Object.keys(components).sort()) {
      out.push('  ' + JSON.stringify(componentName) + ': ' + JSON.stringify(components[componentName], replacer))
    }

    out.push('')
  }

  return out.join('\n')
}

function compareStatePayloads(record: Record<string, { engine: IEngine }>) {
  Object.entries(record)
    .map(([name, { engine }]) => ({ name, serialization: getEngineState(engine) }))
    .reduce((prev, current) => {
      try {
        expect(current.serialization).toEqual(prev.serialization)
      } catch (err) {
        console.info(`${prev.name} != ${current.name}`)
        throw err
      }
      return current
    })
}
