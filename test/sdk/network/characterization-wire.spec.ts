/**
 * Characterization: wire format (golden bytes).
 *
 * Protects the future codec unification. Every buffer that crosses comms today
 * is produced by one of the functions pinned here, so a refactor that changes a
 * single byte will show up as a snapshot diff.
 *
 * Already covered elsewhere (not duplicated here):
 *   - `PutNetworkComponentOperation` / `DeleteComponentNetwork` /
 *     `DeleteEntityNetwork` read/write round-trips at the @dcl/ecs level:
 *     `messages.spec.ts`
 *   - `engineToCrdt` producing a 3-message dump: `state-to-crdt.spec.ts`
 *   - chunk sizing under load: `crdt-chunking.spec.ts`, `chunking-debug.spec.ts`
 *
 * All inputs are fixed (entity ids, timestamps, payloads) so the bytes are
 * deterministic. `Date.now()` is mocked where the format embeds it.
 */
import { Engine, Entity, Schemas } from '../../../packages/@dcl/ecs'
import * as components from '../../../packages/@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/dist/serialization/ByteBuffer'
import {
  AuthoritativePutComponentOperation,
  CrdtMessageType,
  DeleteComponent,
  DeleteComponentNetwork,
  DeleteEntity,
  DeleteEntityNetwork,
  PutComponentOperation,
  PutNetworkComponentOperation
} from '../../../packages/@dcl/ecs/dist/serialization/crdt'
import {
  COMPONENT_ID as TransformComponentId,
  TransformSchema
} from '../../../packages/@dcl/ecs/dist/components/manual/Transform'
import {
  BinaryMessageBus,
  CommsMessage,
  craftCommsMessage,
  decodeCommsMessage,
  decodeString,
  encodeString
} from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { engineToCrdt } from '../../../packages/@dcl/sdk/src/network/state'
// `server/utils.ts` + `chunking.ts` became `codec.ts` in phase 3. The describe
// blocks below keep their original names so the golden snapshot keys still match.
import {
  NetworkMessage,
  RegularMessage,
  isNetworkMessage,
  localMessageToNetwork,
  networkMessageToLocal,
  packChunks,
  readMessages
} from '../../../packages/@dcl/sdk/src/network/codec'
import { decodeEvent, encodeEvent } from '../../../packages/@dcl/sdk/src/network/events/protocol'
import { toHex } from './utils/hex'

const ENTITY = 512 as Entity
const LOCAL_ENTITY = 513 as Entity
const NETWORK_ID = 7
const COMPONENT_ID = 1234
const PAYLOAD = Uint8Array.of(0xde, 0xad, 0xbe, 0xef)

/** One buffer holding every message shape `readMessages` understands. */
function allMessageShapes(): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  PutComponentOperation.write(ENTITY, 1, COMPONENT_ID, PAYLOAD, buffer)
  AuthoritativePutComponentOperation.write(ENTITY, 2, COMPONENT_ID, PAYLOAD, buffer)
  DeleteComponent.write(ENTITY, COMPONENT_ID, 3, buffer)
  DeleteEntity.write(ENTITY, buffer)
  PutNetworkComponentOperation.write(ENTITY, 4, COMPONENT_ID, NETWORK_ID, PAYLOAD, buffer)
  DeleteComponentNetwork.write(ENTITY, COMPONENT_ID, 5, NETWORK_ID, buffer)
  DeleteEntityNetwork.write(ENTITY, NETWORK_ID, buffer)
  return buffer.toBinary()
}

function transformParentOf(buffer: Uint8Array): number {
  const [message] = readMessages(buffer)
  if (!('data' in message)) throw new Error(`expected a put message, got ${CrdtMessageType[message.type]}`)
  return TransformSchema.deserialize(new ReadWriteByteBuffer(message.data)).parent as number
}

function describeMessage(message: NetworkMessage | RegularMessage) {
  return {
    type: CrdtMessageType[message.type],
    entityId: message.entityId,
    componentId: 'componentId' in message ? message.componentId : undefined,
    timestamp: 'timestamp' in message ? message.timestamp : undefined,
    networkId: 'networkId' in message ? message.networkId : undefined,
    data: 'data' in message ? toHex(message.data) : undefined,
    bytes: toHex(message.messageBuffer)
  }
}

describe('wire format characterization', () => {
  describe('server/utils readMessages', () => {
    it('parses every supported message shape and slices the exact source bytes', () => {
      const messages = readMessages(allMessageShapes())
      expect(messages.map(describeMessage)).toMatchSnapshot()
      expect(messages.map((message) => isNetworkMessage(message))).toEqual([
        false,
        false,
        false,
        false,
        true,
        true,
        true
      ])
      // the slices concatenated back must reproduce the source buffer byte for byte
      expect(messages.map((message) => toHex(message.messageBuffer)).join('')).toEqual(toHex(allMessageShapes()))
    })

    it('consumes unknown message types and stops at a truncated tail', () => {
      const buffer = new ReadWriteByteBuffer()
      // unknown message: 8 byte header (length, type) + 4 byte body
      buffer.writeUint32(12)
      buffer.writeUint32(0xff)
      buffer.writeUint32(0)
      PutComponentOperation.write(ENTITY, 1, COMPONENT_ID, PAYLOAD, buffer)
      const withUnknown = readMessages(buffer.toBinary())
      expect(withUnknown).toHaveLength(1)
      expect(withUnknown[0].type).toBe(CrdtMessageType.PUT_COMPONENT)

      const truncated = allMessageShapes().subarray(0, 10)
      expect(readMessages(truncated)).toHaveLength(0)
    })
  })

  describe('server/utils codec conversions', () => {
    it('localMessageToNetwork pins the network encoding of every regular message', () => {
      const regular = readMessages(allMessageShapes()).filter((message) => !isNetworkMessage(message))
      const encoded = regular.map((message) => {
        const buffer = new ReadWriteByteBuffer()
        localMessageToNetwork(message as never, { networkId: NETWORK_ID, entityId: ENTITY }, buffer)
        return { from: CrdtMessageType[message.type], bytes: toHex(buffer.toBinary()) }
      })
      expect(encoded).toMatchSnapshot()
      // AUTHORITATIVE_PUT_COMPONENT has no network counterpart: it encodes to nothing
      expect(encoded.find((entry) => entry.from === 'AUTHORITATIVE_PUT_COMPONENT')!.bytes).toBe('')
    })

    it('networkMessageToLocal pins the local encoding of every network message', () => {
      const network = readMessages(allMessageShapes()).filter((message) => isNetworkMessage(message))
      const encoded = network.map((message) => {
        const buffer = new ReadWriteByteBuffer()
        const body = networkMessageToLocal(message as never, LOCAL_ENTITY, buffer)
        return { from: CrdtMessageType[message.type], to: CrdtMessageType[body.type], bytes: toHex(buffer.toBinary()) }
      })
      expect(encoded).toMatchSnapshot()
    })

    it('networkMessageToLocal with forceCorrections emits AUTHORITATIVE_PUT_COMPONENT', () => {
      const [put] = readMessages(allMessageShapes()).filter(
        (message) => message.type === CrdtMessageType.PUT_COMPONENT_NETWORK
      )
      const buffer = new ReadWriteByteBuffer()
      const body = networkMessageToLocal(put as never, LOCAL_ENTITY, buffer, undefined, true)
      expect(body.type).toBe(CrdtMessageType.AUTHORITATIVE_PUT_COMPONENT)
      expect(toHex(buffer.toBinary())).toMatchSnapshot()
    })

    it('networkMessageToLocal rewrites the Transform parent from NetworkParent', () => {
      const engine = Engine()
      const NetworkParent = components.NetworkParent(engine)
      NetworkParent.create(LOCAL_ENTITY, { networkId: NETWORK_ID, entityId: 600 as Entity })

      const transformPayload = new ReadWriteByteBuffer()
      TransformSchema.serialize(
        {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
          parent: 0 as Entity
        },
        transformPayload
      )
      const source = new ReadWriteByteBuffer()
      PutNetworkComponentOperation.write(
        ENTITY,
        1,
        TransformComponentId,
        NETWORK_ID,
        transformPayload.toBinary(),
        source
      )
      const [message] = readMessages(source.toBinary())

      const withoutParent = new ReadWriteByteBuffer()
      networkMessageToLocal(message as never, LOCAL_ENTITY, withoutParent)
      const withParent = new ReadWriteByteBuffer()
      networkMessageToLocal(message as never, LOCAL_ENTITY, withParent, NetworkParent as never)

      expect(transformParentOf(withoutParent.toBinary())).toBe(0)
      expect(transformParentOf(withParent.toBinary())).toBe(600)
      expect({
        withoutParent: toHex(withoutParent.toBinary()),
        withParent: toHex(withParent.toBinary())
      }).toMatchSnapshot()
    })

    it('round-trips local -> network -> local without changing the bytes', () => {
      const buffer = new ReadWriteByteBuffer()
      PutComponentOperation.write(ENTITY, 1, COMPONENT_ID, PAYLOAD, buffer)
      DeleteComponent.write(ENTITY, COMPONENT_ID, 3, buffer)
      DeleteEntity.write(ENTITY, buffer)
      const original = buffer.toBinary()

      const network = new ReadWriteByteBuffer()
      for (const message of readMessages(original)) {
        localMessageToNetwork(message as never, { networkId: NETWORK_ID, entityId: ENTITY }, network)
      }
      const local = new ReadWriteByteBuffer()
      for (const message of readMessages(network.toBinary())) {
        networkMessageToLocal(message as never, ENTITY, local)
      }
      expect(toHex(local.toBinary())).toEqual(toHex(original))
    })
  })

  describe('chunking', () => {
    /** Each message is 8 bytes of header + 16 bytes of fields + payload. */
    function messagesOfSize(count: number, payloadSize: number): Uint8Array {
      const buffer = new ReadWriteByteBuffer()
      for (let i = 0; i < count; i++) {
        PutComponentOperation.write(ENTITY, i + 1, COMPONENT_ID, new Uint8Array(payloadSize), buffer)
      }
      return buffer.toBinary()
    }

    it('respects message boundaries at the 12KB limit', () => {
      const data = messagesOfSize(12, 2048)
      const messageSize = readMessages(data)[0].messageBuffer.byteLength
      expect(messageSize).toBe(2072)

      const chunks = packChunks(readMessages(data), 12)
      expect(chunks.map((chunk) => chunk.byteLength)).toEqual([10360, 10360, 4144])
      // no message is split: every chunk re-parses into whole messages
      expect(chunks.map((chunk) => readMessages(chunk).length)).toEqual([5, 5, 2])
      for (const chunk of chunks) {
        expect(readMessages(chunk).reduce((total, message) => total + message.messageBuffer.byteLength, 0)).toBe(
          chunk.byteLength
        )
      }
      expect(chunks.reduce((total, chunk) => total + chunk.byteLength, 0)).toBe(data.byteLength)
      expect(packChunks(readMessages(new Uint8Array()), 12)).toEqual([])
    })

    it('drops a single message larger than the limit', () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      const buffer = new ReadWriteByteBuffer()
      PutComponentOperation.write(ENTITY, 1, COMPONENT_ID, new Uint8Array(64), buffer)
      PutComponentOperation.write(ENTITY, 2, COMPONENT_ID, new Uint8Array(13 * 1024), buffer)
      PutComponentOperation.write(ENTITY, 3, COMPONENT_ID, new Uint8Array(64), buffer)

      const chunks = packChunks(readMessages(buffer.toBinary()), 12)
      const timestamps = chunks.flatMap((chunk) =>
        readMessages(chunk).map((message) => ('timestamp' in message ? message.timestamp : -1))
      )
      // the oversized message is silently skipped, the small ones survive
      expect(timestamps).toEqual([1, 3])
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Message too large (13336 bytes)'))
      error.mockRestore()
    })
  })

  describe('state engineToCrdt', () => {
    it('dumps only NetworkEntity-tagged entities, as network messages', async () => {
      const engine = Engine()
      const NetworkEntity = components.NetworkEntity(engine)
      const SyncComponents = components.SyncComponents(engine)
      const Marker = engine.defineComponent('test::Marker', { id: Schemas.String })

      const first = engine.addEntity()
      const second = engine.addEntity()
      const localOnly = engine.addEntity()
      expect([first, second, localOnly]).toEqual([512, 513, 514])

      for (const [entity, id] of [
        [first, 'first'],
        [second, 'second']
      ] as const) {
        NetworkEntity.create(entity, { networkId: NETWORK_ID, entityId: entity })
        SyncComponents.create(entity, { componentIds: [Marker.componentId] })
        Marker.create(entity, { id })
      }
      Marker.create(localOnly, { id: 'local-only' })
      await engine.update(1)

      const chunks = engineToCrdt(engine)
      expect(chunks).toHaveLength(1)
      const dumped = readMessages(chunks[0])
      expect(dumped.every((message) => message.type === CrdtMessageType.PUT_COMPONENT_NETWORK)).toBe(true)
      expect(
        dumped.map((message) => ({
          entityId: message.entityId,
          networkId: 'networkId' in message ? message.networkId : undefined,
          component: engine.getComponent(('componentId' in message && message.componentId) as number).componentName
        }))
      ).toEqual([
        { entityId: first, networkId: NETWORK_ID, component: 'core-schema::Network-Entity' },
        { entityId: second, networkId: NETWORK_ID, component: 'core-schema::Network-Entity' },
        { entityId: first, networkId: NETWORK_ID, component: 'core-schema::Sync-Components' },
        { entityId: second, networkId: NETWORK_ID, component: 'core-schema::Sync-Components' },
        { entityId: first, networkId: NETWORK_ID, component: 'test::Marker' },
        { entityId: second, networkId: NETWORK_ID, component: 'test::Marker' }
      ])
      expect(toHex(chunks[0])).toMatchSnapshot()
    })
  })

  describe('binary-message-bus envelope', () => {
    it('pins the CommsMessage values', () => {
      expect({
        CRDT_SERVER: CommsMessage.CRDT_SERVER,
        CRDT_AUTHORITATIVE: CommsMessage.CRDT_AUTHORITATIVE,
        CUSTOM_EVENT: CommsMessage.CUSTOM_EVENT,
        CRDT: CommsMessage.CRDT,
        REQ_CRDT_STATE: CommsMessage.REQ_CRDT_STATE,
        RES_CRDT_STATE: CommsMessage.RES_CRDT_STATE
      }).toEqual({
        CRDT_SERVER: 4,
        CRDT_AUTHORITATIVE: 5,
        CUSTOM_EVENT: 6,
        CRDT: 7,
        REQ_CRDT_STATE: 8,
        RES_CRDT_STATE: 9
      })
    })

    it('crafts [messageType, ...payload] and decodes [senderLength, ...sender, messageType, ...payload]', () => {
      const crafted = craftCommsMessage(CommsMessage.CRDT, PAYLOAD)
      expect(toHex(crafted)).toBe('07deadbeef')

      // encodeString drops the length prefix ByteBuffer writes, decodeString adds it back
      const sender = encodeString('clientA')
      expect(toHex(sender)).toBe('636c69656e7441')
      expect(decodeString(sender)).toBe('clientA')

      const framed = new Uint8Array(crafted.byteLength + sender.byteLength + 1)
      framed.set([sender.byteLength], 0)
      framed.set(sender, 1)
      framed.set(crafted, sender.byteLength + 1)
      expect(toHex(framed)).toBe('07636c69656e744107deadbeef')

      const decoded = decodeCommsMessage(framed)!
      expect(decoded.sender).toBe('clientA')
      expect(decoded.messageType).toBe(CommsMessage.CRDT)
      expect(toHex(decoded.data)).toBe(toHex(PAYLOAD))
    })

    it('logs and returns undefined for an undecodable envelope', () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      expect(decodeCommsMessage(new Uint8Array())).toBeUndefined()
      expect(error).toHaveBeenCalledWith('Invalid Comms message', expect.anything())
      error.mockRestore()
    })

    it('dispatches by message type, keeping only the last handler registered per type', () => {
      const outbox: { data: Uint8Array; address?: string[] }[] = []
      const bus = BinaryMessageBus((data, address) => outbox.push({ data, address }))
      const first: string[] = []
      const second: string[] = []
      bus.on(CommsMessage.CRDT, (value, sender) => first.push(`${sender}:${toHex(value)}`))
      bus.on(CommsMessage.CRDT, (value, sender) => second.push(`${sender}:${toHex(value)}`))

      bus.emit(CommsMessage.CRDT, PAYLOAD, ['authoritative-server'])
      expect(outbox).toEqual([
        { data: craftCommsMessage(CommsMessage.CRDT, PAYLOAD), address: ['authoritative-server'] }
      ])

      const sender = encodeString('clientB')
      const crafted = craftCommsMessage(CommsMessage.CRDT, PAYLOAD)
      const framed = new Uint8Array(crafted.byteLength + sender.byteLength + 1)
      framed.set([sender.byteLength], 0)
      framed.set(sender, 1)
      framed.set(crafted, sender.byteLength + 1)
      // a REQ_CRDT_STATE envelope with no registered handler is dropped silently
      const unhandled = new Uint8Array(framed)
      unhandled[sender.byteLength + 1] = CommsMessage.REQ_CRDT_STATE
      bus.__processMessages([framed, unhandled])

      expect(first).toEqual([])
      expect(second).toEqual(['clientB:deadbeef'])
    })
  })

  describe('events protocol envelope', () => {
    it('pins the encoded event bytes and the decoded envelope', () => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(1700000000000)
      const registry = { ping: Schemas.Map({ text: Schemas.String }) }

      const encoded = encodeEvent('ping', { text: 'hi' }, registry)
      expect(toHex(encoded)).toMatchSnapshot()
      expect(decodeEvent(encoded, registry)).toEqual({
        eventType: 'ping',
        payload: { text: 'hi' },
        timestamp: 1700000000000
      })

      expect(() => encodeEvent('missing' as never, {} as never, registry)).toThrowError('Unknown event type: missing')
      now.mockRestore()
    })
  })
})
