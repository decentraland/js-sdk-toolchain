import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import WireMessage from '../../packages/@dcl/ecs/src/serialization/wireMessage'
import { createNetworkTransport } from '../../packages/@dcl/ecs/src/systems/crdt/transports/networkTransport'
import { createRendererTransport } from '../../packages/@dcl/ecs/src/systems/crdt/transports/rendererTransport'
import { TransportMessage } from '../../packages/@dcl/ecs/src/systems/crdt/types'
import { setupDclInterfaceForThisSuite, testingEngineApi } from './utils'

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
  setupDclInterfaceForThisSuite({
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
    expect(rendererSpy).toBeCalledTimes(0)
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
})
