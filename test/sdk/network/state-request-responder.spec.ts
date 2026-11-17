const ME = 'me'
const ASKING_PEER = 'asking-peer'

describe('when a peer asks the room for the CRDT state', () => {
  // addSyncTransport binds to the global engine, so each case needs its own registry.
  let engine: any
  let RealmInfo: any
  let EngineInfo: any
  let CommsMessage: any
  let encodeString: (value: string) => Uint8Array
  let inbox: Uint8Array[]
  let answers: number

  function commsMessage(sender: string, type: number): Uint8Array {
    const encoded = encodeString(sender)
    const out = new Uint8Array(1 + encoded.byteLength + 1)
    out.set([encoded.byteLength], 0)
    out.set(encoded, 1)
    out.set([type], 1 + encoded.byteLength)
    return out
  }

  async function boot(isServer: boolean) {
    jest.resetModules()
    const ecs = require('../../../packages/@dcl/ecs/dist')
    const bus = require('../../../packages/@dcl/sdk/network/binary-message-bus')
    const { addSyncTransport } = require('../../../packages/@dcl/sdk/network/message-bus-sync')
    const comps = require('../../../packages/@dcl/ecs/src/components')

    engine = ecs.engine
    RealmInfo = ecs.RealmInfo
    EngineInfo = ecs.EngineInfo
    CommsMessage = bus.CommsMessage
    encodeString = bus.encodeString
    inbox = []
    answers = 0

    addSyncTransport(
      engine,
      async (message: any) => {
        for (const peer of message.peerData ?? []) {
          for (const data of peer.data ?? []) {
            if (data.byteLength && data[0] === CommsMessage.RES_CRDT_STATE) answers++
          }
        }
        const pending = inbox
        inbox = []
        return { data: pending }
      },
      async () => ({ data: { userId: ME, version: 1, displayName: ME, hasConnectedWeb3: true } }),
      async () => ({ isServer }),
      'test'
    )

    // A synced entity, so there is state worth dumping.
    const Transform = comps.Transform(engine)
    const NetworkEntity = comps.NetworkEntity(engine)
    const SyncComponents = comps.SyncComponents(engine)
    const entity = engine.addEntity()
    Transform.create(entity, {
      position: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      parent: 0
    })
    NetworkEntity.create(entity, { networkId: 7, entityId: entity })
    SyncComponents.create(entity, { componentIds: [Transform.componentId] })

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
    for (let i = 0; i < 3; i++) await engine.update(0.1)
    answers = 0

    inbox.push(commsMessage(ASKING_PEER, CommsMessage.REQ_CRDT_STATE))
    for (let i = 0; i < 3; i++) await engine.update(0.1)
  }

  describe('and this participant is a client', () => {
    beforeEach(async () => {
      await boot(false)
    })

    it('should not answer, since only the server state is ever accepted', () => {
      expect(answers).toBe(0)
    })
  })

  describe('and this participant is the authoritative server', () => {
    beforeEach(async () => {
      await boot(true)
    })

    it('should answer with its state', () => {
      expect(answers).toBeGreaterThan(0)
    })
  })
})
