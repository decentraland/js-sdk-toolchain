import { Vector3 } from '@dcl/ecs-math'
import { Engine } from '../src/engine'
import { Entity } from '../src/engine/entity'
import EntityUtils from '../src/engine/entity-utils'
import { createByteBuffer } from '../src/serialization/ByteBuffer'
import { PutComponentOperation } from '../src/serialization/crdt/componentOperation'
import * as transport from '../src/systems/crdt/transport'
import { wait, SandBox } from './utils'

describe('CRDT tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  it('should not send static entities, only updates', () => {
    const { engine, spySend } = SandBox.create({ length: 1 })[0]
    const entityA = engine.addEntity()
    const { Transform } = engine.baseComponents
    const Test = engine.getComponent(SandBox.Position.id)

    // Create two basic components for entity A
    Transform.create(entityA, SandBox.DEFAULT_POSITION)
    Test.create(entityA, { x: 1, y: 2 })

    // Tick update and verify that both messages are being sent through ws.send
    engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(0)

    // Reset ws.send called times
    jest.resetAllMocks()

    Transform.mutable(entityA).position.x = 10
    engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(1)
  })

  it('Send ONLY dirty components via trasnport and spy on send messages', () => {
    const { engine, spySend } = SandBox.create({ length: 1 })[0]
    const entityA = engine.addDynamicEntity()
    const { Transform } = engine.baseComponents
    const Test = engine.getComponent(SandBox.Position.id)

    // Create two basic components for entity A
    Transform.create(entityA, SandBox.DEFAULT_POSITION)
    Test.create(entityA, { x: 1, y: 2 })

    // Tick update and verify that both messages are being sent through ws.send
    engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(1)

    // Reset ws.send called times
    jest.resetAllMocks()

    // Update a component and verify that's being sent through the crdt system
    Transform.mutable(entityA).position.x = 10
    engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(1)

    // Reset ws.send again
    jest.resetAllMocks()

    // Call update again with no updates and verify that there's no message
    // being sent through the wire
    engine.update(1 / 30)
    expect(spySend).toBeCalledTimes(0)
  })

  it('should sent new entity through the wire and process it in the other engine', async () => {
    const [clientA, clientB] = SandBox.create({ length: 2 })

    const entityA = clientA.engine.addDynamicEntity()
    const { Transform } = clientA.engine.baseComponents
    const TransformB = clientB.engine.baseComponents.Transform
    const PositionA = clientA.components.Position
    const PositionB = clientB.components.Position

    // Create two components for a dynamic entity.
    Transform.create(entityA, SandBox.DEFAULT_POSITION)
    const posA = PositionA.create(entityA, { x: 10.231231, y: 0.12321321312 })

    clientA.engine.update(1 / 30)
    expect(PositionB.has(entityA)).toBe(false)

    // Update engine, process crdt messages.
    await wait(SandBox.WS_SEND_DELAY)
    clientB.engine.update(1 / 30)

    expect(SandBox.DEFAULT_POSITION).toBeDeepCloseTo(
      TransformB.getFrom(entityA)
    )
    expect(posA).toBeDeepCloseTo(PositionB.getFrom(entityA))
    expect(clientA.spySend).toBeCalledTimes(1)
    expect(clientB.spySend).toBeCalledTimes(0)
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

      engine.baseComponents.Transform.create(entity, SandBox.DEFAULT_POSITION)
      PosCompomnent.create(entity, Vector3.Up())
      DoorComponent.create(entity, { open: 1 })
    })

    clients.forEach((c) => expect(c.spySend).toBeCalledTimes(0))
    /**
     * If we change a static entity in one scene. It should be send to other peers.
     */
    const [clientA, ...otherClients] = clients
    const { Transform } = clientA.engine.baseComponents
    const DoorComponent = clientA.components.Door
    // Upate Transform from static entity
    const entity = (clientA.engine.addEntity() - 1) as Entity
    Transform.mutable(entity).position.x = 10

    // Create a dynamic entity
    const dynamicEntity = clientA.engine.addDynamicEntity()
    DoorComponent.create(dynamicEntity, { open: 1 })
    const randomGuyWin = (Math.random() * CLIENT_LENGTH - 1) | 0
    otherClients.forEach(({ engine, components }, index) => {
      const DoorComponent = components.Door
      const isRandomGuy = randomGuyWin === index

      function doorSystem(_dt: number) {
        for (const [entity, door] of engine.mutableGroupOf(DoorComponent)) {
          if (EntityUtils.isStaticEntity(entity)) continue
          door.open = isRandomGuy
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
      const doorValue = components.Door.getFrom(dynamicEntity).open
      expect(doorValue).toBe(DOOR_VALUE)
    })
  })
  it('should resend a crdt message if its outdated', () => {
    const [{ engine, transports, spySend }] = SandBox.create({ length: 1 })
    const entity = engine.addEntity()
    engine.baseComponents.Transform.create(entity, SandBox.DEFAULT_POSITION)
    engine.update(1)
    engine.baseComponents.Transform.mutable(entity).position.x = 8
    engine.update(1)
    const buffer = createByteBuffer()
    PutComponentOperation.write(
      entity,
      0,
      engine.baseComponents.Transform,
      buffer
    )
    jest.resetAllMocks()
    const spyWrite = jest.spyOn(PutComponentOperation, 'write')
    transports[0].onmessage!({ data: buffer.toBinary() } as MessageEvent<any>)
    engine.update(1)

    expect(spySend).toBeCalledTimes(1)
    expect(spyWrite).toBeCalledTimes(1)

    jest.resetAllMocks()
    transports[0].onmessage!({} as MessageEvent<any>)
    expect(spySend).toBeCalledTimes(0)
  })

  it('should test transports', () => {
    const transports = transport.getTransports()
    jest.spyOn(transport, 'getTransports').mockReturnValue(transports)
    const sendSpy = jest.spyOn(transports[0], 'send')

    const engine = Engine()
    const entity = engine.addDynamicEntity()
    engine.baseComponents.Transform.create(entity, SandBox.DEFAULT_POSITION)
    engine.update(1)

    expect(sendSpy).toBeCalledTimes(1)
  })
})
