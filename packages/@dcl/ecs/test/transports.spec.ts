import { Engine } from '../src/engine'
import { Schemas } from '../src/schemas'
import WireMessage from '../src/serialization/wireMessage'
import { createNetworkTransport } from '../src/systems/crdt/transports/networkTransport'
import { createRendererTransport } from '../src/systems/crdt/transports/rendererTransport'
import { TransportMessage } from '../src/systems/crdt/types'
import { ensureComponentsFromEngine } from './components/utils'

describe('Transport tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  it('should avoid echo messages', async () => {
    const transport = createRendererTransport()
    const engine = Engine({ transports: [transport] })
    const sdk = await ensureComponentsFromEngine(engine)
    const entity = engine.addEntity()
    const message: TransportMessage = {
      type: WireMessage.Enum.PUT_COMPONENT,
      entity,
      componentId: sdk.Transform._id,
      timestamp: Date.now(),
      transportType: 'renderer',
      messageBuffer: new Uint8Array()
    }
    expect(transport.filter(message)).toBe(false)
  })

  it('should test transports', async () => {
    const transports = [createNetworkTransport(), createRendererTransport()]
    const networkSpy = jest.spyOn(transports[0], 'send')
    const rendererSpy = jest.spyOn(transports[1], 'send')
    const engine = Engine({ transports })
    const sdk = await ensureComponentsFromEngine(engine)
    const entity = engine.addDynamicEntity()
    const UserComponent = engine.defineComponent(
      8888,
      Schemas.Map({ x: Schemas.Byte })
    )

    // Transform component should be sent to renderer transport
    sdk.Transform.create(entity)
    engine.update(1)

    expect(networkSpy).toBeCalledTimes(1)
    expect(rendererSpy).toBeCalledTimes(1)
    jest.resetAllMocks()

    // BoxShape component should be sent to renderer transport
    sdk.BoxShape.create(entity)
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
