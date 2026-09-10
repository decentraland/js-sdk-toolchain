import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import { IEngine } from '../../../packages/@dcl/ecs/src'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { componentNumberFromName } from '../../../packages/@dcl/ecs/src/components/component-number'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { addSyncTransport } from '../../../packages/@dcl/sdk/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../packages/@dcl/sdk/network/binary-message-bus'

const ME = 'me'
const FIRST_RESPONDER = 'firstpeer'
const OTHER_PEER = 'otherpeer'

/** The framing the runtime produces: [senderLen][sender][commsType][payload]. */
function commsMessage(sender: string, type: CommsMessage, payload: Uint8Array): Uint8Array {
  const encoded = encodeString(sender)
  const out = new Uint8Array(1 + encoded.byteLength + 1 + payload.byteLength)
  out.set([encoded.byteLength], 0)
  out.set(encoded, 1)
  out.set([type], 1 + encoded.byteLength)
  out.set(payload, 1 + encoded.byteLength + 1)
  return out
}

/** encodeCRDTState's shape: [addresseeLen][addressee][crdt]. */
function stateResponse(addressee: string, crdt: Uint8Array): Uint8Array {
  const encoded = encodeString(addressee)
  const out = new Uint8Array(1 + encoded.byteLength + crdt.byteLength)
  out.set([encoded.byteLength], 0)
  out.set(encoded, 1)
  out.set(crdt, 1 + encoded.byteLength)
  return out
}

describe('when a peer sends a CRDT state snapshot', () => {
  let engine: IEngine
  let inbox: Uint8Array[]
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let Transform: ReturnType<typeof components.Transform>
  let RealmInfo: ReturnType<typeof components.RealmInfo>
  let snapshotOf: (entityId: number, owner: string) => Uint8Array

  async function tick(times: number) {
    for (let i = 0; i < times; i++) await engine.update(1)
  }

  function mappedEntityIds(): number[] {
    return Array.from(engine.getEntitiesWith(NetworkEntity)).map(([, network]) => network.entityId as number)
  }

  async function connectToComms() {
    RealmInfo.createOrReplace(engine.RootEntity, {
      baseUrl: 'http://localhost',
      realmName: 'test',
      networkId: 1,
      commsAdapter: 'offline',
      isPreview: true,
      room: 'room',
      isConnectedSceneRoom: true
    })
    await tick(1)
  }

  beforeEach(async () => {
    engine = Engine()
    inbox = []
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    RealmInfo = components.RealmInfo(engine)
    components.NetworkParent(engine)
    components.SyncComponents(engine)
    components.PlayerIdentityData(engine)
    components.AvatarBase(engine)
    const EngineInfo = components.EngineInfo(engine)

    addSyncTransport(
      engine,
      async () => {
        const pending = inbox
        inbox = []
        return { data: pending }
      },
      async () => ({ data: { userId: ME, version: 1, displayName: ME, hasConnectedWeb3: true } }) as any
    )

    EngineInfo.create(engine.RootEntity, { tickNumber: 400, frameNumber: 400, totalRuntime: 1, sceneHidden: false })

    snapshotOf = (entityId: number, owner: string) => {
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
      const crdt = new ReadWriteByteBuffer()
      PutNetworkComponentOperation.write(
        entityId as Entity,
        1,
        Transform.componentId,
        componentNumberFromName(owner),
        data.toBinary(),
        crdt
      )
      return crdt.toBinary()
    }

    await tick(2)
  })

  describe('and this client never requested state', () => {
    beforeEach(async () => {
      inbox.push(
        commsMessage(FIRST_RESPONDER, CommsMessage.RES_CRDT_STATE, stateResponse(ME, snapshotOf(512, 'someone')))
      )
      await tick(3)
    })

    it('should ignore the snapshot entirely', () => {
      expect(mappedEntityIds()).toEqual([])
    })
  })

  describe('and a state request is outstanding', () => {
    beforeEach(async () => {
      await connectToComms()
    })

    describe('and the first peer answers it', () => {
      beforeEach(async () => {
        inbox.push(
          commsMessage(FIRST_RESPONDER, CommsMessage.RES_CRDT_STATE, stateResponse(ME, snapshotOf(512, 'someone')))
        )
        await tick(3)
      })

      it('should apply the snapshot', () => {
        expect(mappedEntityIds()).toEqual([512])
      })
    })

    describe('and that same peer sends several chunks', () => {
      beforeEach(async () => {
        // engineToCrdt splits the state and the responder emits every chunk in one
        // go, so they reach us in a single batch.
        for (const entityId of [512, 513, 514]) {
          inbox.push(
            commsMessage(
              FIRST_RESPONDER,
              CommsMessage.RES_CRDT_STATE,
              stateResponse(ME, snapshotOf(entityId, 'someone'))
            )
          )
        }
        await tick(3)
      })

      it('should apply every chunk from it', () => {
        expect(mappedEntityIds().sort()).toEqual([512, 513, 514])
      })
    })

    describe('and several peers answer it', () => {
      beforeEach(async () => {
        inbox.push(
          commsMessage(FIRST_RESPONDER, CommsMessage.RES_CRDT_STATE, stateResponse(ME, snapshotOf(512, 'someone')))
        )
        await tick(3)
        inbox.push(commsMessage(OTHER_PEER, CommsMessage.RES_CRDT_STATE, stateResponse(ME, snapshotOf(513, 'someone'))))
        await tick(3)
      })

      it('should merge every answer, so a peer replying with nothing cannot empty the scene', () => {
        expect(mappedEntityIds().sort()).toEqual([512, 513])
      })
    })

    describe('and the first peer to answer sends an empty snapshot', () => {
      beforeEach(async () => {
        inbox.push(commsMessage(OTHER_PEER, CommsMessage.RES_CRDT_STATE, stateResponse(ME, new Uint8Array())))
        await tick(3)
        inbox.push(
          commsMessage(FIRST_RESPONDER, CommsMessage.RES_CRDT_STATE, stateResponse(ME, snapshotOf(512, 'someone')))
        )
        await tick(3)
      })

      it('should still take the real state from the peer that answers after it', () => {
        expect(mappedEntityIds()).toEqual([512])
      })
    })

    describe('and the snapshot is addressed to a different player', () => {
      beforeEach(async () => {
        inbox.push(
          commsMessage(
            FIRST_RESPONDER,
            CommsMessage.RES_CRDT_STATE,
            stateResponse('somebodyelse', snapshotOf(512, 'someone'))
          )
        )
        await tick(3)
      })

      it('should ignore it', () => {
        expect(mappedEntityIds()).toEqual([])
      })
    })
  })

  describe('and the request window has already closed', () => {
    beforeEach(async () => {
      await connectToComms()
      // requestState waits 5s of engine time and, with nobody else in the scene,
      // gives up and marks the state synchronized.
      await tick(12)
      inbox.push(
        commsMessage(OTHER_PEER, CommsMessage.RES_CRDT_STATE, stateResponse(ME, snapshotOf(512, 'thirdparty')))
      )
      await tick(3)
    })

    it('should ignore a snapshot that arrives after it', () => {
      expect(mappedEntityIds()).toEqual([])
    })
  })
})
