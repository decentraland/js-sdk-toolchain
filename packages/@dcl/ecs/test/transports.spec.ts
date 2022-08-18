import { Schemas } from '../src/schemas'
import { Engine } from '../src/engine'
import WireMessage from '../src/serialization/wireMessage'
import { createNetworkTransport } from '../src/systems/crdt/transports/networkTransport'
import { createRendererTransport } from '../src/systems/crdt/transports/rendererTransport'
import { TransportMessage } from '../src/systems/crdt/types'

describe('Transport tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
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

    // BoxShape component should be sent to renderer transport
    engine.baseComponents.BoxShape.create(entity)
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
})
