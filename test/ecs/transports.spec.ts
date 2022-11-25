import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import WireMessage from '../../packages/@dcl/ecs/src/serialization/wireMessage'
import { createNetworkTransport } from '../../packages/@dcl/ecs/src/systems/crdt/transports/networkTransport'
import { createRendererTransport } from '../../packages/@dcl/ecs/src/systems/crdt/transports/rendererTransport'
import { TransportMessage } from '../../packages/@dcl/ecs/src/systems/crdt/types'
import { setupDclInterfaceForThisSuite, testingEngineApi } from './utils'
import { initializeDcl } from '../../packages/@dcl/ecs/src/runtime/initialization/dcl'

describe('Transport not declared', () => {
  it('should failed if there is no dcl', () => {
    expect(createRendererTransport).toThrowError(
      'Cannot create createRendererTransport without global dcl object'
    )
  })
})

describe('Transport tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  const engineApi = testingEngineApi()
  const mockedDcl = setupDclInterfaceForThisSuite({
    ...engineApi.modules
  })

  it('should avoid echo messages', () => {
    const transport = createRendererTransport()
    const engine = Engine({ transports: [transport] })
    const entity = engine.addEntity()
    const message: TransportMessage = {
      type: WireMessage.Enum.PUT_COMPONENT,
      entity,
      componentId: engine.baseComponents.Transform._id,
      timestamp: Date.now(),
      transportType: 'renderer',
      messageBuffer: new Uint8Array()
    }
    expect(transport.filter(message)).toBe(false)
  })

  it('should test transports', () => {
    const transports = [createNetworkTransport(), createRendererTransport()]
    const networkSpy = jest.spyOn(transports[0], 'send')
    const rendererSpy = jest.spyOn(transports[1], 'send')
    const engine = Engine({ transports })
    const entity = engine.addDynamicEntity()
    const UserComponent = engine.defineComponent(
      { x: Schemas.Byte },

      8888
    )

    // Transform component should be sent to renderer transport
    engine.baseComponents.Transform.create(entity)
    engine.update(1)

    expect(networkSpy).toBeCalledTimes(1)
    expect(rendererSpy).toBeCalledTimes(1)
    jest.resetAllMocks()

    // MeshRenderer component should be sent to renderer transport
    engine.baseComponents.MeshRenderer.create(entity, {
      mesh: { $case: 'box', box: { uvs: [] } }
    })
    engine.update(1)

    expect(networkSpy).toBeCalledTimes(1)
    expect(rendererSpy).toBeCalledTimes(1)
    jest.resetAllMocks()

    // Custom user component should NOT be sent to renderer transport
    const newEntity = engine.addDynamicEntity()
    UserComponent.create(newEntity, { x: 1 })
    engine.update(1)
    expect(networkSpy).toBeCalledTimes(1)

    // Now the send is invoked, but the arg should be []
    expect(rendererSpy).toBeCalledTimes(1)
    expect(rendererSpy).toBeCalledWith(new Uint8Array([]))
  })

  it('should send and receive crdt messages', async () => {
    const transports = [createNetworkTransport(), createRendererTransport()]
    const networkSpy = jest.spyOn(transports[0], 'send')
    const rendererSpy = jest.spyOn(transports[1], 'send')
    const engine = Engine({ transports })
    const entity = engine.addDynamicEntity()

    const originalCrdtSendToRenderer =
      engineApi.modules['~system/EngineApi'].crdtSendToRenderer

    engineApi.modules['~system/EngineApi'].crdtSendToRenderer = jest
      .fn()
      .mockReturnValue({ data: [new Uint8Array([])] })

    transports[1].onmessage = jest.fn()

    // Transform component should be sent to renderer transport
    engine.baseComponents.Transform.create(entity)
    engine.update(1)

    jest.mock('')
    // since callRpc is async function, it's necessary
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(1)
    expect(rendererSpy).toBeCalledTimes(1)
    expect(transports[1].onmessage).toBeCalledTimes(1)
    jest.resetAllMocks()

    engineApi.modules['~system/EngineApi'].crdtSendToRenderer =
      originalCrdtSendToRenderer
  })

  it('should receive crdt messages even if there is no message to send', async () => {
    const rendererTransport = createRendererTransport()
    const transports = [createNetworkTransport(), rendererTransport]

    const networkSpy = jest.spyOn(transports[0], 'send')
    const rendererSpy = jest.spyOn(transports[1], 'send')
    const engine = Engine({ transports })

    initializeDcl(engine)

    const entity = engine.addDynamicEntity()

    const originalCrdtSendToRenderer =
      engineApi.modules['~system/EngineApi'].crdtSendToRenderer

    engineApi.modules['~system/EngineApi'].crdtSendToRenderer = jest
      .fn()
      .mockReturnValue({ data: [new Uint8Array([])] })

    // Transform component should be sent to renderer transport
    engine.baseComponents.Transform.create(entity)
    // 1) A tick with updates
    mockedDcl.tick(1)

    jest.mock('')
    // since callRpc is async function, it's necessary
    await new Promise(process.nextTick)

    // 2) A tick without updates
    transports[1].onmessage = jest.fn()
    mockedDcl.tick(1)
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(2)
    expect(rendererSpy).toBeCalledTimes(2)
    expect(transports[1].onmessage).toBeCalledTimes(1)

    // 3) Another tick without updates
    mockedDcl.tick(1)
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(3)
    expect(rendererSpy).toBeCalledTimes(3)
    expect(transports[1].onmessage).toBeCalledTimes(2)

    engine.baseComponents.Transform.createOrReplace(entity)

    // 4) Tick with updates
    mockedDcl.tick(1)
    await new Promise(process.nextTick)

    expect(networkSpy).toBeCalledTimes(4)
    expect(rendererSpy).toBeCalledTimes(4)
    expect(transports[1].onmessage).toBeCalledTimes(3)

    jest.resetAllMocks()

    engineApi.modules['~system/EngineApi'].crdtSendToRenderer =
      originalCrdtSendToRenderer
  })
})
