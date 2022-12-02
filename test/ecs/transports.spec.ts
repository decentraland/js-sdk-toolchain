import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { Engine, components } from '../../packages/@dcl/ecs/src'
import WireMessage from '../../packages/@dcl/ecs/src/serialization/wireMessage'
import { createRendererTransport } from '../../packages/@dcl/sdk/src/internal/transports/rendererTransport'
import { TransportMessage } from '../../packages/@dcl/ecs/src/systems/crdt/types'

declare const process: any

describe('Transport tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  it('should avoid echo messages', () => {
    const crdtSendToRenderer = jest.fn()
    const transport = createRendererTransport({ crdtSendToRenderer })
    const engine = Engine()
    engine.addTransport(transport)
    const Transform = components.Transform(engine)
    const entity = engine.addEntity()
    const message: TransportMessage = {
      type: WireMessage.Enum.PUT_COMPONENT,
      entity,
      componentId: Transform._id,
      timestamp: Date.now(),
      transportType: 'renderer',
      messageBuffer: new Uint8Array()
    }
    expect(transport.filter(message)).toBe(false)
  })

  it('should test transports', () => {
    const crdtSendToRenderer = jest.fn()
    const transports = [createRendererTransport({ crdtSendToRenderer })]
    const rendererSpy = jest.spyOn(transports[1], 'send')
    const engine = Engine()
    const Transform = components.Transform(engine)
    const MeshRenderer = components.MeshRenderer(engine)
    transports.forEach(engine.addTransport)
    const entity = engine.addEntity()
    const UserComponent = engine.defineComponent({ x: Schemas.Byte }, 8888)

    // Transform component should be sent to renderer transport
    Transform.create(entity)
    engine.update(1)

    expect(rendererSpy).toBeCalledTimes(1)
    jest.resetAllMocks()

    // MeshRenderer component should be sent to renderer transport
    MeshRenderer.create(entity, {
      mesh: { $case: 'box', box: { uvs: [] } }
    })
    engine.update(1)

    expect(rendererSpy).toBeCalledTimes(1)
    jest.resetAllMocks()

    // Custom user component should NOT be sent to renderer transport
    const newEntity = engine.addEntity()
    UserComponent.create(newEntity, { x: 1 })
    engine.update(1)

    // Now the send is invoked, but the arg should be []
    expect(rendererSpy).toBeCalledTimes(1)
    expect(rendererSpy).toBeCalledWith(new Uint8Array([]))
  })

  it('should send and receive crdt messages', async () => {
    const crdtSendToRenderer = jest.fn()
    const transports = [createRendererTransport({ crdtSendToRenderer })]
    const networkSpy = jest.spyOn(transports[0], 'send')
    const rendererSpy = jest.spyOn(transports[1], 'send')
    const engine = Engine()
    const Transform = components.Transform(engine)
    transports.forEach(engine.addTransport)
    const entity = engine.addEntity()

    crdtSendToRenderer.mockReturnValue({ data: [new Uint8Array([])] })

    transports[1].onmessage = jest.fn()

    // Transform component should be sent to renderer transport
    Transform.create(entity)
    engine.update(1)

    jest.mock('')
    // since callRpc is async function, it's necessary
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(1)
    expect(rendererSpy).toBeCalledTimes(1)
    expect(transports[1].onmessage).toBeCalledTimes(1)
    jest.resetAllMocks()
  })

  it('should receive crdt messages even if there is no message to send', async () => {
    const crdtSendToRenderer = jest.fn()
    const rendererTransport = createRendererTransport({ crdtSendToRenderer })
    const transports = [rendererTransport]

    const networkSpy = jest.spyOn(transports[0], 'send')
    const rendererSpy = jest.spyOn(transports[1], 'send')
    const engine = Engine()
    const Transform = components.Transform(engine)
    transports.forEach(engine.addTransport)

    const entity = engine.addEntity()

    crdtSendToRenderer.mockReturnValue({ data: [new Uint8Array([])] })

    // Transform component should be sent to renderer transport
    Transform.create(entity)
    // 1) A tick with updates
    engine.update(1)

    // since callRpc is async function, it's necessary
    await new Promise(process.nextTick)

    // 2) A tick without updates
    transports[1].onmessage = jest.fn()
    engine.update(1)
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(2)
    expect(rendererSpy).toBeCalledTimes(2)
    expect(transports[1].onmessage).toBeCalledTimes(1)

    // 3) Another tick without updates
    engine.update(1)
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(3)
    expect(rendererSpy).toBeCalledTimes(3)
    expect(transports[1].onmessage).toBeCalledTimes(2)

    Transform.createOrReplace(entity)

    // 4) Tick with updates
    engine.update(1)
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(4)
    expect(rendererSpy).toBeCalledTimes(4)
    expect(transports[1].onmessage).toBeCalledTimes(3)

    jest.resetAllMocks()
  })

  it('should rendererTransport throw an error ', async () => {
    const crdtSendToRenderer = jest.fn()
    const rendererTransport = createRendererTransport({ crdtSendToRenderer })
    const transports = [rendererTransport]

    const engine = Engine()
    const Transform = components.Transform(engine)
    transports.forEach(engine.addTransport)

    const entity = engine.addEntity()

    const errorSend = 'test error handling'
    crdtSendToRenderer.mockRejectedValue(errorSend)

    // Transform component should be sent to renderer transport
    Transform.create(entity)
    engine.update(1)

    expect(crdtSendToRenderer).toBeCalledTimes(1)

    jest.resetAllMocks()
  })
})
