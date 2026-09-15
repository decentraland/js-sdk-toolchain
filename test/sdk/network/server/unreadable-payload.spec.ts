import { Engine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../../../packages/@dcl/ecs/src/engine/entity'
import { IEngine, Transport } from '../../../../packages/@dcl/ecs/src'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { createServerValidator } from '../../../../packages/@dcl/sdk/network/server'
import { CommsMessage } from '../../../../packages/@dcl/sdk/network/binary-message-bus'

const NETWORK_ID = 7
const PEER = 'peer'

describe('when the server receives a component update from a peer', () => {
  let engine: IEngine
  let transport: Transport
  let validator: ReturnType<typeof createServerValidator>
  let Transform: ReturnType<typeof components.Transform>
  let emitted: { type: number; to?: string[] }[]

  function chunk(entityId: number, componentId: number, data: Uint8Array): Uint8Array {
    const buf = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(entityId as Entity, 1, componentId, NETWORK_ID, data, buf)
    return buf.toBinary()
  }

  function validTransformBytes(): Uint8Array {
    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      data
    )
    return data.toBinary()
  }

  /** What the sync transport does with the validator's output. */
  async function feed(bytes: Uint8Array) {
    const applied = validator.processServerMessages(bytes, PEER)
    if (applied.byteLength) transport.onmessage!(applied)
    await engine.update(1)
  }

  beforeEach(() => {
    engine = Engine()
    transport = { type: 'network', filter: () => false, send: async () => {} }
    engine.addTransport(transport)
    Transform = components.Transform(engine)
    components.NetworkEntity(engine)
    components.NetworkParent(engine)
    components.CreatedBy(engine)
    emitted = []
    validator = createServerValidator({
      engine,
      binaryMessageBus: {
        emit: (type: number, _data: Uint8Array, to?: string[]) => emitted.push({ type, to }),
        on: () => {}
      } as any
    })
  })

  describe('and the payload is shorter than the schema needs', () => {
    let truncated: Uint8Array

    beforeEach(async () => {
      truncated = validTransformBytes().subarray(0, 6)
      // The server takes a good update first, so it holds state it can answer with.
      await feed(chunk(900, Transform.componentId, validTransformBytes()))
      emitted = []
      await feed(chunk(900, Transform.componentId, truncated))
    })

    it('should not relay it to the other peers', () => {
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toEqual([])
    })

    it('should answer the sender with the authoritative state rather than dropping it in silence', () => {
      const corrections = emitted.filter(
        (message) => message.type === CommsMessage.CRDT_AUTHORITATIVE && message.to?.includes(PEER)
      )
      expect(corrections.length).toBeGreaterThan(0)
    })
  })

  describe('and the component id is one this engine never defined', () => {
    beforeEach(async () => {
      await feed(chunk(901, 999999, validTransformBytes()))
    })

    it('should not relay it to the other peers', () => {
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toEqual([])
    })
  })

  describe('and the update is well formed', () => {
    beforeEach(async () => {
      await feed(chunk(902, Transform.componentId, validTransformBytes()))
    })

    it('should relay it to the other peers', () => {
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT).length).toBeGreaterThan(0)
    })
  })
})
