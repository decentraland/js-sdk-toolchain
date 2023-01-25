import {
  components,
  CrdtMessageType,
  DeleteComponent,
  IEngine,
  PutComponentOperation,
  Schemas
} from '../../packages/@dcl/ecs/src'
import { Entity, EntityUtils, RESERVED_STATIC_ENTITIES } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Vector3 } from '../../packages/@dcl/sdk/src/math'
import { compareStatePayloads } from '../crdt/utils'
import { stateToString } from '../crdt/utils/state'
import { checkCrdtStateWithEngine, SandBox, wait } from './utils'

async function simpleScene(engine: IEngine) {
  const Transform = components.Transform(engine)
  const MeshRenderer = components.MeshRenderer(engine)

  const entityA = engine.addEntity()
  Transform.create(entityA, { position: Vector3.One() })
  MeshRenderer.setBox(entityA)

  for (let i = 0; i < 10; i++) {
    Transform.getMutable(entityA).position.x += 10
  }

  MeshRenderer.setCylinder(entityA)

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
  Transform.create(entityShouldReused, { position: Vector3.Left() })
  MeshRenderer.setPlane(entityShouldReused)

  await engine.update(1)

  engine.removeEntity(tenEntities[0])
  engine.removeEntity(tenEntities[1])
  engine.removeEntity(tenEntities[2])

  await engine.update(1)

  // These two line shouldn't has effect in the final state, entityA has already deleted
  Transform.create(entityA, { position: Vector3.Left() })
  MeshRenderer.setPlane(entityA)

  await engine.update(1)
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
    const Test = engine.getComponent(SandBox.Position.id)

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
    const Test = engine.getComponent(SandBox.Position.id)

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
      const PosCompomnent = engine.getComponent(SandBox.Position.id)
      const DoorComponent = engine.getComponent(SandBox.Door.id)
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

  it('should resend a crdt message if its outdated', async () => {
    const [{ engine, transports, spySend }] = SandBox.create({ length: 1 })
    const entity = engine.addEntity()
    const Transform = components.Transform(engine)
    Transform.create(entity, SandBox.DEFAULT_POSITION)
    await engine.update(1)
    Transform.getMutable(entity).position.x = 8
    await engine.update(1)
    const buffer = new ReadWriteByteBuffer()
    PutComponentOperation.write(entity, 0, Transform, buffer)
    jest.resetAllMocks()
    transports[0].onmessage!(buffer.toBinary())
    await engine.update(1)

    const outdatedBuffer = new ReadWriteByteBuffer()
    PutComponentOperation.write(entity, 2, Transform, outdatedBuffer)
    expect(spySend).toBeCalledWith(outdatedBuffer.toBinary())
  })

  it('should resend a crdt delete message if its outdated', async () => {
    const [{ engine, transports, spySend }] = SandBox.create({ length: 1 })
    const entity = engine.addEntity()
    const Transform = components.Transform(engine)
    Transform.create(entity, SandBox.DEFAULT_POSITION)
    await engine.update(1)
    const buffer = new ReadWriteByteBuffer()
    PutComponentOperation.write(entity, 0, Transform, buffer)
    Transform.deleteFrom(entity)
    await engine.update(1)
    jest.resetAllMocks()
    transports[0].onmessage!(buffer.toBinary())
    await engine.update(1)
    const outdatedBuffer = new ReadWriteByteBuffer()
    DeleteComponent.write(entity, Transform.componentId, 2, outdatedBuffer)
    expect(spySend).toBeCalledWith(outdatedBuffer.toBinary())
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
    const cusutomComponent = engine.defineComponent('custom component', {
      open: Schemas.Boolean
    })
    cusutomComponent.create(entity, { open: false })
    await engine.update(1)

    const buffer = new ReadWriteByteBuffer()
    PutComponentOperation.write(entity, 1, cusutomComponent, buffer)
    serverTransport.onmessage!(buffer.toBinary())
    await serverEngine.update(1)
    const crdtState = serverEngine.getCrdtState()
    const component = crdtState.components.get(cusutomComponent.componentId)!.get(entity as number)!
    expect(component?.data).toStrictEqual(cusutomComponent.toBinary(entity).toBinary())
    expect(component?.timestamp).toBe(1)
  })

  it('should converge to the same final state (a simple transform creation)', async () => {
    const {
      clients: [clientA, clientB, clientC],
      getCrdtStates
    } = SandBox.createEngines({ length: 3 })

    const entityA = clientA.engine.addEntity()
    clientA.Transform.create(entityA, { position: Vector3.One() })

    // before the update, the crdt state is out-to-date
    expect(checkCrdtStateWithEngine(clientA.engine).conflicts.length === 0).toBe(false)
    await clientA.engine.update(1)

    // now, the crdt state and engine should converge
    expect(checkCrdtStateWithEngine(clientA.engine).conflicts.length === 0).toBe(true)

    // between clients, ClientA hasn't sent anything yet, so, crdt state won't be synched
    expect(compareStatePayloads(getCrdtStates())).toBe(false)

    clientA.flushOutgoing()

    // flush is not enough, the updates should be called to read messages
    expect(compareStatePayloads(getCrdtStates())).toBe(false)

    await clientB.engine.update(1)
    await clientC.engine.update(1)

    // now, it should be all synched
    expect(compareStatePayloads(getCrdtStates())).toBe(true)
    expect(checkCrdtStateWithEngine(clientA.engine).conflicts).toEqual([])
    expect(checkCrdtStateWithEngine(clientB.engine).conflicts).toEqual([])
    expect(checkCrdtStateWithEngine(clientC.engine).conflicts).toEqual([])
  })

  it('should ignore invalid message type', async () => {
    const {
      clients: [clientA]
    } = SandBox.createEngines({ length: 1 })

    const buf = new ReadWriteByteBuffer()
    buf.writeUint32(8)
    buf.writeUint32(0x83294732)

    clientA.transports[0].onmessage!(buf.toBinary()!)

    const stateBeforeProcessMessage = stateToString(clientA.engine.getCrdtState())
    await clientA.engine.update(1)
    expect(stateToString(clientA.engine.getCrdtState())).toBe(stateBeforeProcessMessage)
  })

  it('should converge to the same final state (more complex scene code)', async () => {
    const {
      clients: [clientA, clientB, clientC],
      getCrdtStates
    } = SandBox.createEngines({ length: 3 })

    // runs a kind of scene in the clientA
    await simpleScene(clientA.engine)

    // sends all its updates
    clientA.flushOutgoing()

    // all engine run their tick
    await clientA.engine.update(1)
    await clientB.engine.update(1)
    await clientC.engine.update(1)

    // now, it should be all synched
    expect(compareStatePayloads(getCrdtStates())).toBe(true)
    expect(checkCrdtStateWithEngine(clientA.engine).conflicts).toEqual([])
    expect(checkCrdtStateWithEngine(clientB.engine).conflicts).toEqual([])
    expect(checkCrdtStateWithEngine(clientC.engine).conflicts).toEqual([])
  })

  describe(`should converge to the same final state (more complex scene code) (shuffle messages)`, () => {
    const shuffleSeeds = [283945239, 219, 1, 8239423, 19230]
    shuffleSeeds.forEach((seedValue) => {
      it(`shuffle with seed ${seedValue}`, async () => {
        const {
          clients: [clientA, clientB, clientC],
          getCrdtStates
        } = SandBox.createEngines({ length: 3 })

        await simpleScene(clientA.engine)

        // same as previous test, now I shuffle the messages
        clientA.shuffleOutgoingMessages(seedValue)
        clientA.flushOutgoing()

        await clientA.engine.update(1)
        await clientB.engine.update(1)
        await clientC.engine.update(1)

        // now, it should be all synched
        expect(compareStatePayloads(getCrdtStates())).toBe(true)
        expect(checkCrdtStateWithEngine(clientA.engine).conflicts).toEqual([])
        expect(checkCrdtStateWithEngine(clientB.engine).conflicts).toEqual([])
        expect(checkCrdtStateWithEngine(clientC.engine).conflicts).toEqual([])
      })

      it(`shuffle messages with seed ${seedValue}, and with multiple scene runs`, async () => {
        const {
          clients: [clientA, clientB, clientC],
          getCrdtStates
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
        expect(compareStatePayloads(getCrdtStates())).toBe(true)
        expect(checkCrdtStateWithEngine(clientA.engine).conflicts).toEqual([])
        expect(checkCrdtStateWithEngine(clientB.engine).conflicts).toEqual([])
        expect(checkCrdtStateWithEngine(clientC.engine).conflicts).toEqual([])
      })
    })
  })

  it('should receive an update from a version greater', async () => {
    const {
      clients: [clientA, clientB],
      testCrdtSynchronization
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

    const res = await testCrdtSynchronization()
    expect(res.allConflicts.length).toBe(0)
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
      clients: [clientA],
      getCrdtStates,
      testCrdtSynchronization
    } = SandBox.createEngines({ length: 3 })

    const cube = clientA.engine.addEntity()
    clientA.Transform.create(cube)

    const entitiesCalledToBeRemoved = []
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

    const result = await testCrdtSynchronization()
    expect(result.allConflicts.length).toBe(0)
    expect(result.crdtStateConverged).toBe(true)

    const deletedEntities = getCrdtStates()[0].deletedEntities.get()
    expect(deletedEntities.length).toBe(entitiesCalledToBeRemoved.length)
  })
})
