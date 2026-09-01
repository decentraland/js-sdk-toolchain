import * as components from '../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { readMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/message'
import { DeleteEntityNetwork } from '../../packages/@dcl/ecs/src/serialization/crdt/network/deleteEntityNetwork'
import { PutNetworkComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { CrdtMessage, CrdtMessageType } from '../../packages/@dcl/ecs/src/serialization/crdt/types'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

const PEER_NETWORK_ID = 7
// Both engines allocate from RESERVED_STATIC_ENTITIES, so the peer's first
// entity carries the same number as this scene's first entity. That collision
// is the normal case, not a contrived one.
const PEER_ENTITY = 512 as Entity

function readAll(chunk: Uint8Array): CrdtMessage[] {
  const buffer = new ReadWriteByteBuffer(chunk)
  const messages: CrdtMessage[] = []
  let message: CrdtMessage | null
  while ((message = readMessage(buffer))) {
    messages.push(message)
  }
  return messages
}

describe('when a peer deletes a network entity whose id collides with a live local entity', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let rendererMessages: CrdtMessage[]
  let localEntity: Entity
  let mappedEntity: Entity

  beforeEach(async () => {
    engine = Engine()
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    rendererMessages = []

    const renderer: Transport = {
      type: 'renderer',
      filter: () => true,
      send: async (message) => {
        for (const chunk of Array.isArray(message) ? message : [message]) {
          rendererMessages.push(...readAll(chunk))
        }
      }
    }
    const network: Transport = { type: 'network', filter: () => true, send: async () => {} }
    engine.addTransport(renderer)
    engine.addTransport(network)

    // A live local entity that happens to carry the same number as the peer's.
    localEntity = engine.addEntity()
    Transform.create(localEntity)
    await engine.update(1)

    // The peer announces its entity, which this engine maps to one of its own.
    const put = new ReadWriteByteBuffer()
    const transformData = new ReadWriteByteBuffer()
    Transform.schema.serialize(Transform.get(localEntity), transformData)
    PutNetworkComponentOperation.write(
      PEER_ENTITY,
      1,
      Transform.componentId,
      PEER_NETWORK_ID,
      transformData.toBinary(),
      put
    )
    network.onmessage!(put.toBinary())
    await engine.update(1)

    mappedEntity = Array.from(engine.getEntitiesWith(NetworkEntity))[0][0]
    rendererMessages = []

    // Now the peer deletes it.
    const del = new ReadWriteByteBuffer()
    DeleteEntityNetwork.write(PEER_ENTITY, PEER_NETWORK_ID, del)
    network.onmessage!(del.toBinary())
    await engine.update(1)
  })

  it('should map the peer entity to a different local entity than the one already in use', () => {
    expect(mappedEntity).not.toBe(localEntity)
  })

  it('should tell the renderer to delete the mapped entity', () => {
    const deletes = rendererMessages.filter((message) => message.type === CrdtMessageType.DELETE_ENTITY)

    expect(deletes.map((message) => message.entityId)).toEqual([mappedEntity])
  })

  it('should not tell the renderer to delete the unrelated local entity', () => {
    const deletes = rendererMessages.filter((message) => message.type === CrdtMessageType.DELETE_ENTITY)

    expect(deletes.map((message) => message.entityId)).not.toContain(localEntity)
  })

  it('should leave the unrelated local entity alive', () => {
    expect(Transform.has(localEntity)).toBe(true)
  })
})
