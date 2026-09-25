import { engine, RealmInfo } from '../../../packages/@dcl/ecs/dist'
import * as components from '../../../packages/@dcl/ecs/dist/components'
import { addSyncTransport } from '../../../packages/@dcl/sdk/src/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'
import type { IsServerResponse } from '~system/EngineApi'

function craftCommsMessage(sender: string, type: CommsMessage): Uint8Array {
  const senderBytes = encodeString(sender)
  const buf = new Uint8Array(1 + senderBytes.byteLength + 1)
  buf[0] = senderBytes.byteLength
  buf.set(senderBytes, 1)
  buf[1 + senderBytes.byteLength] = type
  return buf
}

async function createSync(isServer: Promise<IsServerResponse>) {
  const sent: CommsMessage[] = []
  const sendBinary = async (msg: SendBinaryRequest): Promise<SendBinaryResponse> => {
    for (const peerData of msg.peerData) {
      for (const data of peerData.data) sent.push(data[0])
    }
    return { data: [] }
  }
  const getUserData = async () => ({
    data: { userId: 'peer', version: 1, displayName: 'A', hasConnectedWeb3: true, avatar: undefined }
  })
  const sync = addSyncTransport(engine as any, sendBinary, getUserData as any, () => isServer, 'peer')
  RealmInfo.createOrReplace(engine.RootEntity, {
    baseUrl: 'http://localhost:8000',
    realmName: 'LocalPreview',
    networkId: 0,
    commsAdapter: 'ws-room',
    isPreview: true,
    room: 'room-1',
    isConnectedSceneRoom: true
  } as any)
  await engine.update(1)
  await engine.update(1)
  return { sync, sent }
}

describe('state sync', () => {
  let sent: CommsMessage[]
  let sync: ReturnType<typeof addSyncTransport>

  beforeEach(() => {
    components.NetworkEntity(engine as any)
    components.NetworkParent(engine as any)
    components.Transform(engine as any)
    components.SyncComponents(engine as any)
  })

  describe('when running as a client', () => {
    beforeEach(async () => {
      ;({ sync, sent } = await createSync(Promise.resolve({ isServer: false })))
    })

    describe('and a non-authoritative peer answers the state request', () => {
      let requestsBefore: number

      beforeEach(async () => {
        requestsBefore = sent.filter((type) => type === CommsMessage.REQ_CRDT_STATE).length
        sync.binaryMessageBus.__processMessages([craftCommsMessage('some-other-peer', CommsMessage.RES_CRDT_STATE)])
        await engine.update(3)
        await engine.update(1)
      })

      it('should stay unsynchronized', () => {
        expect(sync.isStateSyncronized()).toBe(false)
      })

      it('should keep retrying the state request', () => {
        expect(sent.filter((type) => type === CommsMessage.REQ_CRDT_STATE).length).toBeGreaterThan(requestsBefore)
      })
    })

    describe('and another client requests the state', () => {
      beforeEach(async () => {
        sync.binaryMessageBus.__processMessages([craftCommsMessage('some-other-peer', CommsMessage.REQ_CRDT_STATE)])
        await engine.update(1)
      })

      it('should not answer because only the authoritative server owns the state', () => {
        expect(sent).not.toContain(CommsMessage.RES_CRDT_STATE)
      })
    })
  })

  describe('when running as the authoritative server', () => {
    beforeEach(async () => {
      ;({ sync, sent } = await createSync(Promise.resolve({ isServer: true })))
      sync.binaryMessageBus.__processMessages([craftCommsMessage('some-client', CommsMessage.REQ_CRDT_STATE)])
      await engine.update(1)
    })

    it('should answer the state request', () => {
      expect(sent).toContain(CommsMessage.RES_CRDT_STATE)
    })
  })

  describe('when the runtime has not yet said whether this is the server', () => {
    beforeEach(async () => {
      ;({ sync, sent } = await createSync(new Promise(() => {})))
      sync.binaryMessageBus.__processMessages([craftCommsMessage('some-client', CommsMessage.REQ_CRDT_STATE)])
      await engine.update(1)
    })

    it('should not answer the state request', () => {
      expect(sent).not.toContain(CommsMessage.RES_CRDT_STATE)
    })
  })
})
