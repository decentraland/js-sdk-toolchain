import {
  BinaryMessageBus,
  CommsMessage,
  decodeString,
  encodeString
} from '../../../packages/@dcl/sdk/network/binary-message-bus'
import { createMessageBusRelay } from '../../../packages/@dcl/sdk/network/message-bus-relay'
import { Atom } from '../../../packages/@dcl/sdk/atom'

const AUTH_SERVER = 'authoritative-server'
const ME = '0xMe'
const OTHER = '0xother'

function incoming(sender: string, frame: unknown): Uint8Array {
  const encodedSender = encodeString(sender)
  const payload = encodeString(JSON.stringify(frame))
  const out = new Uint8Array(1 + encodedSender.byteLength + 1 + payload.byteLength)
  out.set([encodedSender.byteLength], 0)
  out.set(encodedSender, 1)
  out.set([CommsMessage.MESSAGE_BUS], 1 + encodedSender.byteLength)
  out.set(payload, 1 + encodedSender.byteLength + 1)
  return out
}

function setup(role: { isServer?: boolean; roomReady: boolean }) {
  const sent: unknown[] = []
  const bus = BinaryMessageBus((data) => {
    if (data[0] === CommsMessage.MESSAGE_BUS) sent.push(JSON.parse(decodeString(data.subarray(1))))
  })
  const isServerAtom = Atom<boolean>()
  if (role.isServer !== undefined) isServerAtom.swap(role.isServer)
  const isRoomReadyAtom = Atom<boolean>(role.roomReady)
  const received: Array<[string, string]> = []
  const relay = createMessageBusRelay(bus, isServerAtom, isRoomReadyAtom, { userId: ME, networkId: 1 })
  relay.onMessage((message, sender) => received.push([message, sender]))
  const deliver = async (sender: string, frame: unknown) => {
    bus.__processMessages([incoming(sender, frame)])
    await new Promise((resolve) => setImmediate(resolve))
  }
  return { relay, sent, received, deliver, isServerAtom, isRoomReadyAtom }
}

describe('MessageBus relay', () => {
  describe('when a client sends before the room is ready', () => {
    it('should queue the message and send it once the room is ready', () => {
      const { relay, sent, isRoomReadyAtom } = setup({ isServer: false, roomReady: false })

      relay.send('hello')
      expect(sent).toEqual([])

      isRoomReadyAtom.swap(true)
      expect(sent).toEqual([{ message: 'hello' }])
    })
  })

  describe('when the server receives a client message', () => {
    it('should rebroadcast it with the original sender and deliver it to its own listeners', async () => {
      const { sent, received, deliver } = setup({ isServer: true, roomReady: true })

      await deliver(OTHER, { message: 'hi' })

      expect(sent).toEqual([{ message: 'hi', from: OTHER }])
      expect(received).toEqual([['hi', OTHER]])
    })

    it('should relay it once its role resolves when the message arrived first', async () => {
      const { sent, deliver, isServerAtom } = setup({ roomReady: true })

      await deliver(OTHER, { message: 'early' })
      expect(sent).toEqual([])

      isServerAtom.swap(true)
      await new Promise((resolve) => setImmediate(resolve))
      expect(sent).toEqual([{ message: 'early', from: OTHER }])
    })
  })

  describe('when the server emits its own message', () => {
    it('should broadcast it without a sender so clients attribute it to the server', async () => {
      const client = setup({ isServer: false, roomReady: true })
      const server = setup({ isServer: true, roomReady: true })

      server.relay.send('from-server')
      await client.deliver(AUTH_SERVER, server.sent[0])

      expect(server.sent).toEqual([{ message: 'from-server' }])
      expect(client.received).toEqual([['from-server', AUTH_SERVER]])
    })
  })

  describe('when a client receives a message', () => {
    it('should deliver a relay from the server with the original sender', async () => {
      const { received, deliver } = setup({ isServer: false, roomReady: true })

      await deliver(AUTH_SERVER, { message: 'hi', from: OTHER })

      expect(received).toEqual([['hi', OTHER]])
    })

    it('should drop the relay of its own message, which it already echoed locally', async () => {
      const { received, deliver } = setup({ isServer: false, roomReady: true })

      await deliver(AUTH_SERVER, { message: 'mine', from: ME.toLowerCase() })

      expect(received).toEqual([])
    })

    it('should ignore messages that did not come through the server', async () => {
      const { received, deliver } = setup({ isServer: false, roomReady: true })

      await deliver(OTHER, { message: 'spoofed', from: AUTH_SERVER })

      expect(received).toEqual([])
    })
  })
})
