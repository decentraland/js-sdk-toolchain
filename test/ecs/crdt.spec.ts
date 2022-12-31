import { components, Schemas } from '../../packages/@dcl/ecs/src'
import { Vector3 } from '../../packages/@dcl/sdk/src/math'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { createByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { ComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/componentOperation'
import WireMessage from '../../packages/@dcl/ecs/src/serialization/wireMessage'
import { wait, SandBox } from './utils'

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
        for (const [entity, _readOnlyDoor] of engine.getEntitiesWith(
          DoorComponent
        )) {
          DoorComponent.getMutable(entity).open = isRandomGuy
            ? DOOR_VALUE
            : Math.max(Math.random(), DOOR_VALUE) // Some random value < DOOR_VALUE
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
    const buffer = createByteBuffer()
    ComponentOperation.write(
      WireMessage.Enum.PUT_COMPONENT,
      entity,
      0,
      Transform,
      buffer
    )
    jest.resetAllMocks()
    transports[0].onmessage!(buffer.toBinary())
    await engine.update(1)

    const outdatedBuffer = createByteBuffer()
    ComponentOperation.write(
      WireMessage.Enum.PUT_COMPONENT,
      entity,
      2,
      Transform,
      outdatedBuffer
    )
    expect(spySend).toBeCalledWith(outdatedBuffer.toBinary())
  })

  it('should resend a crdt delete message if its outdated', async () => {
    const [{ engine, transports, spySend }] = SandBox.create({ length: 1 })
    const entity = engine.addEntity()
    const Transform = components.Transform(engine)
    Transform.create(entity, SandBox.DEFAULT_POSITION)
    await engine.update(1)
    const buffer = createByteBuffer()
    ComponentOperation.write(
      WireMessage.Enum.PUT_COMPONENT,
      entity,
      0,
      Transform,
      buffer
    )
    Transform.deleteFrom(entity)
    await engine.update(1)
    jest.resetAllMocks()
    transports[0].onmessage!(buffer.toBinary())
    await engine.update(1)
    const outdatedBuffer = createByteBuffer()
    ComponentOperation.write(
      WireMessage.Enum.DELETE_COMPONENT,
      entity,
      2,
      Transform,
      outdatedBuffer
    )
    expect(spySend).toBeCalledWith(outdatedBuffer.toBinary())
  })

  it('should remove a component if we receive a DELETE_COMPONENT operation message', async () => {
    const [{ engine, transports }] = SandBox.create({ length: 1 })
    const [transport] = transports
    const entity = engine.addEntity()
    const Transform = components.Transform(engine)

    Transform.create(entity, SandBox.DEFAULT_POSITION)
    await engine.update(1)

    const buffer = createByteBuffer()
    ComponentOperation.write(
      WireMessage.Enum.DELETE_COMPONENT,
      entity,
      2,
      Transform,
      buffer
    )
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
    const cusutomComponent = engine.defineComponent(
      { open: Schemas.Boolean },
      12371273
    )
    cusutomComponent.create(entity, { open: false })
    await engine.update(1)

    const buffer = createByteBuffer()
    ComponentOperation.write(
      WireMessage.Enum.PUT_COMPONENT,
      entity,
      1,
      cusutomComponent,
      buffer
    )
    serverTransport.onmessage!(buffer.toBinary())
    await serverEngine.update(1)
    const crdtState = serverEngine.getCrdtState()
    const component = crdtState.get(entity as number)?.get(cusutomComponent._id)
    expect(component?.data).toStrictEqual(
      cusutomComponent.toBinary(entity).toBinary()
    )
    expect(component?.timestamp).toBe(1)
  })
})
