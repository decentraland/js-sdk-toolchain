import {
  Engine,
  Entity,
  IEngine,
  MapComponentDefinition,
  PutNetworkComponentOperation,
  Schemas
} from '../../packages/@dcl/ecs/src'
import * as components from '../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

const NETWORK_ID = 7
const REMOTE_ENTITY = 100 as Entity

type Harness = {
  component: MapComponentDefinition<{ value: number }>
  engine: IEngine
  NetworkEntity: ReturnType<typeof components.NetworkEntity>
  sendRemoteUpdate: (value: number) => void
}

function setup(): Harness {
  const engine = Engine()
  const component = engine.defineComponent('indexed-component', { value: Schemas.Int })
  const networkTransport: Transport = {
    type: 'network',
    filter: () => false,
    send: jest.fn().mockResolvedValue(undefined)
  }
  engine.addTransport(networkTransport)
  const NetworkEntity = components.NetworkEntity(engine)

  // A remote peer addressing (NETWORK_ID, REMOTE_ENTITY) with a component update.
  const sendRemoteUpdate = (value: number) => {
    const payload = new ReadWriteByteBuffer()
    component.schema.serialize({ value }, payload)
    const message = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(
      REMOTE_ENTITY,
      value,
      component.componentId,
      NETWORK_ID,
      payload.toBinary(),
      message
    )
    networkTransport.onmessage!(message.toBinary())
  }

  return { component, engine, NetworkEntity, sendRemoteUpdate }
}

describe('CRDT network entity index', () => {
  describe('when a network message targets an existing mapped entity', () => {
    let component: MapComponentDefinition<{ value: number }>
    let getEntitiesWith: jest.SpyInstance
    let localEntity: Entity

    beforeEach(async () => {
      const h = setup()
      component = h.component
      localEntity = h.engine.addEntity()
      h.NetworkEntity.create(localEntity, { networkId: NETWORK_ID, entityId: REMOTE_ENTITY })
      await h.engine.update(1)

      getEntitiesWith = jest.spyOn(h.engine, 'getEntitiesWith')
      h.sendRemoteUpdate(42)
      await h.engine.update(1)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should apply the component update to the mapped local entity', () => {
      expect(component.get(localEntity).value).toBe(42)
    })

    it('should resolve the mapping without scanning engine entities', () => {
      expect(getEntitiesWith).not.toHaveBeenCalled()
    })
  })

  describe('when the mapped entity is re-pointed at a different remote entity', () => {
    let component: MapComponentDefinition<{ value: number }>
    let localEntity: Entity

    beforeEach(async () => {
      const h = setup()
      component = h.component
      localEntity = h.engine.addEntity()
      h.NetworkEntity.create(localEntity, { networkId: NETWORK_ID, entityId: REMOTE_ENTITY })
      await h.engine.update(1)

      // The local entity now represents a different remote entity.
      h.NetworkEntity.createOrReplace(localEntity, { networkId: NETWORK_ID, entityId: 999 as Entity })
      await h.engine.update(1)

      h.sendRemoteUpdate(42)
      await h.engine.update(1)
    })

    it('should not deliver the old mapping to the re-pointed entity', () => {
      expect(component.getOrNull(localEntity)).toBeNull()
    })
  })

  describe('when the NetworkEntity component is deleted from the mapped entity', () => {
    let component: MapComponentDefinition<{ value: number }>
    let localEntity: Entity

    beforeEach(async () => {
      const h = setup()
      component = h.component
      localEntity = h.engine.addEntity()
      h.NetworkEntity.create(localEntity, { networkId: NETWORK_ID, entityId: REMOTE_ENTITY })
      await h.engine.update(1)

      h.NetworkEntity.deleteFrom(localEntity)
      await h.engine.update(1)

      h.sendRemoteUpdate(42)
      await h.engine.update(1)
    })

    it('should not deliver the update to the unmapped entity', () => {
      expect(component.getOrNull(localEntity)).toBeNull()
    })
  })

  describe('and a second local entity takes over the same remote mapping', () => {
    let component: MapComponentDefinition<{ value: number }>
    let firstEntity: Entity
    let secondEntity: Entity

    beforeEach(async () => {
      const h = setup()
      component = h.component
      firstEntity = h.engine.addEntity()
      h.NetworkEntity.create(firstEntity, { networkId: NETWORK_ID, entityId: REMOTE_ENTITY })
      await h.engine.update(1)

      secondEntity = h.engine.addEntity()
      h.NetworkEntity.create(secondEntity, { networkId: NETWORK_ID, entityId: REMOTE_ENTITY })
      await h.engine.update(1)

      // Removing the previous owner must not unindex the mapping the new owner holds.
      h.engine.removeEntity(firstEntity)
      await h.engine.update(1)

      h.sendRemoteUpdate(42)
      await h.engine.update(1)
    })

    it('should deliver the update to the entity that took the mapping over', () => {
      expect(component.get(secondEntity).value).toBe(42)
    })
  })
})
