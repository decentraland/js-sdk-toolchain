import {
  Engine,
  Entity,
  IEngine,
  MapComponentDefinition,
  PutNetworkComponentOperation,
  Schemas
} from '../../../packages/@dcl/ecs/src'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Transport } from '../../../packages/@dcl/ecs/src/systems/crdt/types'

describe('CRDT network entity index', () => {
  let component: MapComponentDefinition<{ value: number }>
  let componentData: ReadWriteByteBuffer
  let engine: IEngine
  let getEntitiesWith: jest.SpyInstance
  let localEntity: Entity
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let networkMessage: ReadWriteByteBuffer
  let networkTransport: Transport

  beforeEach(async () => {
    engine = Engine()
    component = engine.defineComponent('indexed-component', { value: Schemas.Int })
    networkTransport = {
      type: 'network',
      filter: () => false,
      send: jest.fn().mockResolvedValue(undefined)
    }
    engine.addTransport(networkTransport)

    NetworkEntity = components.NetworkEntity(engine)
    localEntity = engine.addEntity()
    NetworkEntity.create(localEntity, { networkId: 7, entityId: 100 as Entity })
    await engine.update(1)

    getEntitiesWith = jest.spyOn(engine, 'getEntitiesWith')
    componentData = new ReadWriteByteBuffer()
    component.schema.serialize({ value: 42 }, componentData)
    networkMessage = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(
      100 as Entity,
      1,
      component.componentId,
      7,
      componentData.toBinary(),
      networkMessage
    )
    networkTransport.onmessage!(networkMessage.toBinary())
    await engine.update(1)
  })

  afterEach(() => {
    getEntitiesWith.mockRestore()
    jest.restoreAllMocks()
  })

  describe('when a network message targets an existing mapped entity', () => {
    it('should apply the component update to the mapped local entity', () => {
      expect(component.get(localEntity).value).toBe(42)
    })

    it('should resolve the mapping without scanning engine entities', () => {
      expect(getEntitiesWith).not.toHaveBeenCalled()
    })
  })
})
