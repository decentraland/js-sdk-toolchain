import { engine, RealmInfo } from '../../../packages/@dcl/ecs'
import { addSyncTransport } from '../../../packages/@dcl/sdk/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../packages/@dcl/sdk/network/binary-message-bus'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

function inboundMessage(sender: string, type: CommsMessage, payload = new Uint8Array()): Uint8Array {
  const senderBytes = encodeString(sender)
  const message = new Uint8Array(1 + senderBytes.byteLength + 1 + payload.byteLength)
  message[0] = senderBytes.byteLength
  message.set(senderBytes, 1)
  message[1 + senderBytes.byteLength] = type
  message.set(payload, 1 + senderBytes.byteLength + 1)
  return message
}

describe('authoritative state retry', () => {
  it('keeps retrying after a state response from a non-authoritative peer', async () => {
    let sendCount = 0
    let stateRequests = 0

    const sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse> = async (msg) => {
      for (const peerMessage of msg.peerData) {
        for (const data of peerMessage.data) {
          if (data[0] === CommsMessage.REQ_CRDT_STATE) stateRequests++
        }
      }

      sendCount++
      return {
        data: sendCount === 1 ? [inboundMessage('regular-peer', CommsMessage.RES_CRDT_STATE)] : []
      }
    }

    addSyncTransport(
      engine,
      sendBinary,
      async () => ({
        data: { userId: 'state-retry-test', version: 1, displayName: 'test', hasConnectedWeb3: false, avatar: undefined }
      }),
      async () => ({ isServer: false }),
      'state-retry-test'
    )

    RealmInfo.createOrReplace(engine.RootEntity, {
      baseUrl: 'https://example.invalid',
      commsAdapter: 'test',
      networkId: 1,
      realmName: 'test',
      room: 'test',
      isPreview: true,
      isConnectedSceneRoom: true
    })

    await engine.update(0)
    await engine.update(2.1)

    expect(stateRequests).toBeGreaterThanOrEqual(2)
  })
})
