import { Engine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../../../packages/@dcl/ecs/src/engine/entity'
import { IEngine } from '../../../../packages/@dcl/ecs/src'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { CrdtMessageType } from '../../../../packages/@dcl/ecs/src/serialization/crdt/types'
import { PutNetworkComponentOperation } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { DeleteEntityNetwork } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/deleteEntityNetwork'
import { readMessages } from '../../../../packages/@dcl/sdk/src/network/server/utils'
import { createServerValidator } from '../../../../packages/@dcl/sdk/network/server'

const NETWORK_ID = 7
const PEER = 'peer'

/** A frame declaring `length` for `type` and carrying nothing after the header. */
function headerOnlyFrame(type: CrdtMessageType, length: number): Uint8Array {
  const buf = new ReadWriteByteBuffer()
  buf.writeUint32(length)
  buf.writeUint32(type)
  return buf.toBinary()
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.byteLength
  }
  return out
}

describe('when a peer sends a frame too short for the type it claims', () => {
  let engine: IEngine
  let validator: ReturnType<typeof createServerValidator>
  let Transform: ReturnType<typeof components.Transform>

  function validUpdate(entityId: number): Uint8Array {
    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      data
    )
    const buf = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(entityId as Entity, 1, Transform.componentId, NETWORK_ID, data.toBinary(), buf)
    return buf.toBinary()
  }

  beforeEach(() => {
    engine = Engine()
    engine.addTransport({ type: 'network', filter: () => false, send: async () => {} })
    Transform = components.Transform(engine)
    components.NetworkEntity(engine)
    components.NetworkParent(engine)
    components.CreatedBy(engine)
    validator = createServerValidator({
      engine,
      binaryMessageBus: { emit: () => {}, on: () => {} } as any
    })
  })

  describe('and it is a header-only network delete', () => {
    let chunk: Uint8Array

    beforeEach(() => {
      chunk = headerOnlyFrame(CrdtMessageType.DELETE_ENTITY_NETWORK, 8)
    })

    it('should not throw out of the parser', () => {
      expect(() => readMessages(chunk)).not.toThrow()
    })

    it('should not throw out of the client ingress', () => {
      expect(() => validator.processClientMessages(chunk, 'authoritative-server')).not.toThrow()
    })

    it('should not throw out of the server ingress', () => {
      expect(() => validator.processServerMessages(chunk, PEER)).not.toThrow()
    })
  })

  describe('and a valid update follows it in the same chunk', () => {
    let messages: ReturnType<typeof readMessages>

    beforeEach(() => {
      messages = readMessages(concat(headerOnlyFrame(CrdtMessageType.DELETE_ENTITY_NETWORK, 8), validUpdate(900)))
    })

    it('should still read the valid update behind it', () => {
      expect(messages.map((message) => message.type)).toEqual([CrdtMessageType.PUT_COMPONENT_NETWORK])
    })
  })

  describe('and the chunk holds a real network delete followed by an update', () => {
    let messages: ReturnType<typeof readMessages>

    beforeEach(() => {
      const del = new ReadWriteByteBuffer()
      DeleteEntityNetwork.write(600 as Entity, NETWORK_ID, del)
      messages = readMessages(concat(del.toBinary(), validUpdate(901)))
    })

    it('should read both, despite the writer declaring fewer bytes than it emits', () => {
      expect(messages.map((message) => message.type)).toEqual([
        CrdtMessageType.DELETE_ENTITY_NETWORK,
        CrdtMessageType.PUT_COMPONENT_NETWORK
      ])
    })
  })
})
