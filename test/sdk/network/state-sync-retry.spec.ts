import { engine, RealmInfo } from '../../../packages/@dcl/ecs/dist'
import * as components from '../../../packages/@dcl/ecs/dist/components'
import { addSyncTransport } from '../../../packages/@dcl/sdk/src/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

function craftResCrdtState(sender: string): Uint8Array {
  const senderBytes = encodeString(sender)
  const buf = new Uint8Array(1 + senderBytes.byteLength + 1)
  buf[0] = senderBytes.byteLength
  buf.set(senderBytes, 1)
  buf[1 + senderBytes.byteLength] = CommsMessage.RES_CRDT_STATE
  return buf
}

describe('state-sync request retry', () => {
  it('keeps retrying REQ_CRDT_STATE after a non-authoritative RES_CRDT_STATE', async () => {
    components.NetworkEntity(engine as any)
    components.NetworkParent(engine as any)
    components.Transform(engine as any)
    components.SyncComponents(engine as any)

    let reqCount = 0
    const sendBinary = async (msg: SendBinaryRequest): Promise<SendBinaryResponse> => {
      for (const peerData of msg.peerData) {
        for (const data of peerData.data) {
          if (data[0] === CommsMessage.REQ_CRDT_STATE) reqCount++
        }
      }
      return { data: [] }
    }
    const getUserData = async () => ({
      data: { userId: 'clientA', version: 1, displayName: 'A', hasConnectedWeb3: true, avatar: undefined }
    })
    const isServerFn = async () => ({ isServer: false })

    const sync = addSyncTransport(engine as any, sendBinary, getUserData as any, isServerFn as any, 'clientA')

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

    expect(reqCount).toBeGreaterThanOrEqual(1)
    const reqsBeforeNonAuthResponse = reqCount

    sync.binaryMessageBus.__processMessages([craftResCrdtState('some-other-peer')])
    expect(sync.isStateSyncronized()).toBe(false)

    await engine.update(3)
    await engine.update(1)

    expect(reqCount).toBeGreaterThan(reqsBeforeNonAuthResponse)
  })
})
