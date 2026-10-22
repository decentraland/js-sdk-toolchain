const ME = 'me'
const OTHER_PEER = 'someotherpeer'
const AUTH_SERVER = 'authoritative-server'
const RETRY_INTERVAL_SECONDS = 2

describe('when a client is waiting for the authoritative server to send it the state', () => {
  // addSyncTransport binds to the global engine and installs a retry system on it, so
  // each case needs its own module registry to get a clean one.
  let engine: any
  let RealmInfo: any
  let EngineInfo: any
  let CommsMessage: any
  let encodeString: (value: string) => Uint8Array
  let inbox: Uint8Array[]
  let stateRequests: number

  function commsMessage(sender: string, type: number, payload: Uint8Array): Uint8Array {
    const encoded = encodeString(sender)
    const out = new Uint8Array(1 + encoded.byteLength + 1 + payload.byteLength)
    out.set([encoded.byteLength], 0)
    out.set(encoded, 1)
    out.set([type], 1 + encoded.byteLength)
    out.set(payload, 1 + encoded.byteLength + 1)
    return out
  }

  async function tick(seconds: number) {
    await engine.update(seconds)
  }

  beforeEach(async () => {
    jest.resetModules()
    const ecs = require('../../../packages/@dcl/ecs/dist')
    const bus = require('../../../packages/@dcl/sdk/network/binary-message-bus')
    const { addSyncTransport } = require('../../../packages/@dcl/sdk/network/message-bus-sync')
    engine = ecs.engine
    RealmInfo = ecs.RealmInfo
    EngineInfo = ecs.EngineInfo
    CommsMessage = bus.CommsMessage
    encodeString = bus.encodeString

    inbox = []
    stateRequests = 0

    addSyncTransport(
      engine,
      async (message: any) => {
        for (const peer of message.peerData ?? []) {
          for (const data of peer.data ?? []) {
            if (data.byteLength && data[0] === CommsMessage.REQ_CRDT_STATE) stateRequests++
          }
        }
        const pending = inbox
        inbox = []
        return { data: pending }
      },
      async () => ({ data: { userId: ME, version: 1, displayName: ME, hasConnectedWeb3: true } }),
      async () => ({ isServer: false }),
      'test'
    )

    EngineInfo.createOrReplace(engine.RootEntity, {
      tickNumber: 400,
      frameNumber: 400,
      totalRuntime: 1,
      sceneHidden: false
    })
    RealmInfo.createOrReplace(engine.RootEntity, {
      baseUrl: 'http://localhost',
      realmName: 'test',
      networkId: 1,
      commsAdapter: 'offline',
      isPreview: true,
      room: 'room',
      isConnectedSceneRoom: true
    })
    await tick(0.1)
    stateRequests = 0
  })

  describe('and a peer that is not the server answers the request', () => {
    beforeEach(async () => {
      inbox.push(commsMessage(OTHER_PEER, CommsMessage.RES_CRDT_STATE, new Uint8Array()))
      await tick(0.1)
      await tick(RETRY_INTERVAL_SECONDS + 1)
      await tick(0.1)
    })

    it('should still retry the request, since the state never arrived', () => {
      expect(stateRequests).toBeGreaterThan(0)
    })
  })

  describe('and the authoritative server answers the request', () => {
    beforeEach(async () => {
      inbox.push(commsMessage(AUTH_SERVER, CommsMessage.RES_CRDT_STATE, new Uint8Array()))
      await tick(0.1)
      await tick(RETRY_INTERVAL_SECONDS + 1)
      await tick(0.1)
    })

    it('should stop asking', () => {
      expect(stateRequests).toBe(0)
    })
  })
})
