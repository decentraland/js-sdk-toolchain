import { Engine, Entity, IEngine, MapComponentDefinition, Schemas } from '../../../packages/@dcl/ecs/src'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { Transport } from '../../../packages/@dcl/ecs/src/systems/crdt/types'

describe('CRDT network chunk boundaries', () => {
  let component: MapComponentDefinition<{ value: string }>
  let engine: IEngine
  let firstEntity: Entity
  let networkTransport: Transport
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let secondEntity: Entity
  let send: jest.MockedFunction<Transport['send']>
  let sentChunks: Uint8Array[]

  beforeEach(async () => {
    engine = Engine()
    component = engine.defineComponent('boundary-component', { value: Schemas.String })
    sentChunks = []
    send = jest.fn(async (message: Uint8Array | Uint8Array[]) => {
      sentChunks = Array.isArray(message) ? message : [message]
    })
    networkTransport = {
      type: 'network',
      filter: (message) => 'componentId' in message && message.componentId === component.componentId,
      send
    }
    engine.addTransport(networkTransport)

    NetworkEntity = components.NetworkEntity(engine)
    firstEntity = engine.addEntity()
    secondEntity = engine.addEntity()
    NetworkEntity.create(firstEntity, { networkId: 1, entityId: firstEntity })
    NetworkEntity.create(secondEntity, { networkId: 1, entityId: secondEntity })
    component.create(firstEntity, { value: 'a'.repeat(6115) })
    component.create(secondEntity, { value: 'b'.repeat(6115) })

    await engine.update(1)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('when network headers push a local batch over the LiveKit limit', () => {
    it('should split the serialized network messages into valid chunks', () => {
      expect(sentChunks.map((chunk) => chunk.byteLength)).toEqual([6147, 6147])
    })
  })
})
