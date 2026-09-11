import { Engine, IEngine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity, EntityState } from '../../../../packages/@dcl/ecs/src/engine/entity'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { addSyncTransport, AUTH_SERVER_PEER_ID } from '../../../../packages/@dcl/sdk/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../../packages/@dcl/sdk/network/binary-message-bus'

type RemovalResult = { entity: Entity; requestId: number; status: 'accepted' | 'rejected' | 'timeout' }
type Peer = {
  address: string
  engine: IEngine
  inbox: Uint8Array[]
  Transform: ReturnType<typeof components.Transform>
  NetworkEntity: ReturnType<typeof components.NetworkEntity>
  SyncComponents: ReturnType<typeof components.SyncComponents>
  UiText: ReturnType<typeof components.UiText>
  sync: ReturnType<typeof addSyncTransport>
}
type Packet = { sender: string; addresses: string[]; data: Uint8Array }

describe('when a synchronized entity removal reports its outcome', () => {
  let peers: Peer[]
  let requester: Peer
  let server: Peer
  let observer: Peer
  let requesterEntity: Entity
  let serverEntity: Entity
  let observerEntity: Entity
  let packets: Packet[]
  let allowDeletion: boolean
  let blockRequests: boolean
  let blockServerReplies: boolean
  let dropRequests: number
  let dropResults: number
  let onResult: jest.Mock<void, [RemovalResult]>
  let unsubscribe: () => void
  let statesAtResult: EntityState[]
  let deleteChecks: jest.Mock<boolean, []>

  function frame(sender: string, data: Uint8Array): Uint8Array {
    const address = encodeString(sender)
    const framed = new Uint8Array(1 + address.length + data.length)
    framed[0] = address.length
    framed.set(address, 1)
    framed.set(data, address.length + 1)
    return framed
  }

  function createPeer(address: string): Peer {
    const engine = Engine()
    const Transform = components.Transform(engine)
    const NetworkEntity = components.NetworkEntity(engine)
    const SyncComponents = components.SyncComponents(engine)
    const UiText = components.UiText(engine)
    components.NetworkParent(engine)
    const sync = addSyncTransport(
      engine,
      async (message) => {
        for (const packet of message.peerData ?? []) {
          for (const data of packet.data ?? []) {
            packets.push({ sender: address, addresses: [...packet.address], data: data.slice() })
            for (const recipient of peers) {
              if (
                recipient.address === address ||
                (packet.address.length && !packet.address.includes(recipient.address))
              )
                continue
              if (
                address === requester.address &&
                recipient === server &&
                data[0] === CommsMessage.REQUEST_ENTITY_REMOVAL
              ) {
                if (blockRequests) continue
                if (dropRequests > 0) {
                  dropRequests--
                  continue
                }
              }
              if (address === AUTH_SERVER_PEER_ID && recipient === requester) {
                if (blockServerReplies) continue
                if (data[0] === CommsMessage.ENTITY_REMOVAL_RESULT && dropResults > 0) {
                  dropResults--
                  continue
                }
              }
              recipient.inbox.push(frame(address, data))
            }
          }
        }
        return { data: peers.find((peer) => peer.address === address)!.inbox.splice(0) }
      },
      async () => ({ data: { userId: address, version: 1, displayName: address, hasConnectedWeb3: true } }),
      async () => ({ isServer: address === AUTH_SERVER_PEER_ID }),
      address
    )
    const peer: Peer = { address, engine, inbox: [], Transform, NetworkEntity, SyncComponents, UiText, sync }
    peers.push(peer)
    return peer
  }

  function findEntity(peer: Peer): Entity {
    const entry = Array.from(peer.engine.getEntitiesWith(peer.NetworkEntity)).find(
      ([, network]) => network.networkId === 7 && network.entityId === 100
    )
    if (!entry) throw new Error(`Missing network entity on ${peer.address}`)
    return entry[0]
  }

  async function tick(count: number = 6, dt: number = 0.1): Promise<void> {
    for (let frameNumber = 0; frameNumber < count; frameNumber++) {
      for (const peer of peers) await peer.engine.update(dt)
    }
  }

  function requests(): Packet[] {
    return packets.filter(
      (packet) => packet.sender === requester.address && packet.data[0] === CommsMessage.REQUEST_ENTITY_REMOVAL
    )
  }

  function results(): Packet[] {
    return packets.filter(
      (packet) => packet.sender === AUTH_SERVER_PEER_ID && packet.data[0] === CommsMessage.ENTITY_REMOVAL_RESULT
    )
  }

  function requestId(packet: Packet): number {
    return new DataView(packet.data.buffer, packet.data.byteOffset + 1, packet.data.byteLength - 1).getUint32(8, true)
  }

  beforeEach(async () => {
    peers = []
    packets = []
    allowDeletion = false
    blockRequests = false
    blockServerReplies = false
    dropRequests = 0
    dropResults = 0
    statesAtResult = []
    requester = createPeer('requester')
    server = createPeer(AUTH_SERVER_PEER_ID)
    observer = createPeer('observer')
    requester.engine.addEntity()
    observer.engine.addEntity()
    observer.engine.addEntity()
    await tick(2)
    serverEntity = server.engine.addEntity()
    server.Transform.create(serverEntity, { position: { x: 4, y: 5, z: 6 } })
    server.NetworkEntity.create(serverEntity, { networkId: 7, entityId: 100 as Entity })
    server.SyncComponents.create(serverEntity, { componentIds: [server.Transform.componentId] })
    await tick()
    requesterEntity = findEntity(requester)
    observerEntity = findEntity(observer)
    requester.UiText.create(requesterEntity, { value: 'local state' })
    await tick()
    deleteChecks = jest.fn<boolean, []>().mockImplementation(() => allowDeletion)
    server.Transform.validateBeforeChange(({ newValue }) => newValue !== undefined || deleteChecks())
    onResult = jest.fn<void, [RemovalResult]>().mockImplementation(() => {
      statesAtResult.push(requester.engine.getEntityState(requesterEntity))
    })
    unsubscribe = requester.sync.onEntityRemovalResult(onResult)
    packets = []
  })

  afterEach(() => {
    unsubscribe()
    jest.restoreAllMocks()
    peers.length = 0
  })

  describe('and the server accepts deletion', () => {
    beforeEach(async () => {
      allowDeletion = true
      requester.engine.removeEntity(requesterEntity)
      await tick()
    })

    it('should report the accepted request once after local deletion is committed', () => {
      expect(onResult.mock.calls).toEqual([
        [{ entity: requesterEntity, requestId: requestId(requests()[0]), status: 'accepted' }]
      ])
      expect(statesAtResult).toEqual([EntityState.Removed])
    })

    it('should remove the entity on every participant', () => {
      expect([
        requester.Transform.has(requesterEntity),
        server.Transform.has(serverEntity),
        observer.Transform.has(observerEntity)
      ]).toEqual([false, false, false])
    })

    it('should target the result to the requester', () => {
      expect(
        results().every((packet) => packet.addresses.length === 1 && packet.addresses[0] === requester.address)
      ).toBe(true)
      expect(results().length).toBeGreaterThan(0)
    })
  })

  describe('and the server rejects deletion', () => {
    beforeEach(async () => {
      requester.engine.removeEntity(requesterEntity)
      await tick()
    })

    it('should report rejection while retaining synchronized and local state', () => {
      expect(onResult.mock.calls).toEqual([
        [{ entity: requesterEntity, requestId: requestId(requests()[0]), status: 'rejected' }]
      ])
      expect(statesAtResult).toEqual([EntityState.UsedEntity])
      expect(requester.UiText.get(requesterEntity).value).toBe('local state')
      expect([
        requester.Transform.has(requesterEntity),
        server.Transform.has(serverEntity),
        observer.Transform.has(observerEntity)
      ]).toEqual([true, true, true])
    })

    describe('and the scene requests deletion again', () => {
      let firstId: number

      beforeEach(async () => {
        firstId = requestId(requests()[0])
        allowDeletion = true
        requester.engine.removeEntity(requesterEntity)
        await tick()
      })

      it('should use a fresh request ID and report the new outcome', () => {
        expect(requestId(requests()[requests().length - 1])).not.toBe(firstId)
        expect(onResult.mock.calls.map(([result]) => result.status)).toEqual(['rejected', 'accepted'])
      })
    })
  })

  describe('and no request reaches the server', () => {
    beforeEach(async () => {
      blockRequests = true
      requester.engine.removeEntity(requesterEntity)
      await tick(12, 1)
    })

    it('should report timeout without deleting the entity', () => {
      expect(onResult.mock.calls).toEqual([
        [{ entity: requesterEntity, requestId: requestId(requests()[0]), status: 'timeout' }]
      ])
      expect(requester.engine.getEntityState(requesterEntity)).toBe(EntityState.UsedEntity)
      expect(requester.UiText.get(requesterEntity).value).toBe('local state')
    })

    it('should retry the same request instead of creating new attempts', () => {
      expect(requests().length).toBeGreaterThan(1)
      expect(new Set(requests().map(requestId)).size).toBe(1)
    })

    describe('and the deadline has already elapsed', () => {
      let countAtTimeout: number

      beforeEach(async () => {
        countAtTimeout = requests().length
        await tick(5, 1)
      })

      it('should stop retrying after the terminal result', () => {
        expect(requests().length).toBe(countAtTimeout)
        expect(onResult).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('and the server accepts but all its replies are lost', () => {
    beforeEach(async () => {
      allowDeletion = true
      blockServerReplies = true
      requester.engine.removeEntity(requesterEntity)
      await tick(12, 1)
    })

    it('should report timeout without treating it as authoritative rejection', () => {
      expect(onResult.mock.calls.map(([result]) => result.status)).toEqual(['timeout'])
      expect([
        requester.Transform.has(requesterEntity),
        server.Transform.has(serverEntity),
        observer.Transform.has(observerEntity)
      ]).toEqual([true, false, false])
    })
  })

  describe('and the first request packet is lost', () => {
    beforeEach(async () => {
      allowDeletion = true
      dropRequests = 1
      requester.engine.removeEntity(requesterEntity)
      await tick(8, 0.5)
    })

    it('should recover by retrying the same request ID', () => {
      expect(requests().length).toBeGreaterThan(1)
      expect(new Set(requests().map(requestId)).size).toBe(1)
      expect(onResult.mock.calls.map(([result]) => result.status)).toEqual(['accepted'])
    })
  })

  describe('and the first rejection result is lost', () => {
    beforeEach(async () => {
      dropResults = 1
      requester.engine.removeEntity(requesterEntity)
      await tick(6, 0.5)
    })

    it('should return the cached decision on retry without validating twice', () => {
      expect(requests().length).toBeGreaterThan(1)
      expect(new Set(requests().map(requestId)).size).toBe(1)
      expect(deleteChecks).toHaveBeenCalledTimes(1)
      expect(onResult.mock.calls.map(([result]) => result.status)).toEqual(['rejected'])
    })
  })

  describe('and an older result arrives during a newer attempt', () => {
    let oldResult: Uint8Array
    let newRequestId: number

    beforeEach(async () => {
      requester.engine.removeEntity(requesterEntity)
      await tick()
      oldResult = results()[0].data.slice()
      onResult.mockClear()
      blockRequests = true
      requester.engine.removeEntity(requesterEntity)
      await tick(1)
      newRequestId = requestId(requests()[requests().length - 1])
      requester.inbox.push(frame(AUTH_SERVER_PEER_ID, oldResult))
      await tick()
    })

    it('should ignore the previous attempt result', () => {
      expect(onResult).not.toHaveBeenCalled()
      expect(requester.Transform.has(requesterEntity)).toBe(true)
    })

    describe('and the current attempt later reaches the server', () => {
      beforeEach(async () => {
        allowDeletion = true
        blockRequests = false
        await tick(6, 0.5)
      })

      it('should still complete the current attempt', () => {
        expect(onResult.mock.calls).toEqual([
          [{ entity: requesterEntity, requestId: newRequestId, status: 'accepted' }]
        ])
      })
    })
  })

  describe('and a non-server peer forges an accepted result', () => {
    let forged: Uint8Array

    beforeEach(async () => {
      blockRequests = true
      requester.engine.removeEntity(requesterEntity)
      await tick(1)
      forged = new Uint8Array(22)
      forged[0] = CommsMessage.ENTITY_REMOVAL_RESULT
      forged.set(requests()[0].data.subarray(1), 1)
      forged[21] = 0
      requester.inbox.push(frame(observer.address, forged))
      await tick()
    })

    it('should ignore the unauthenticated result', () => {
      expect(onResult).not.toHaveBeenCalled()
      expect(requester.Transform.has(requesterEntity)).toBe(true)
    })
  })

  describe('and repeated calls target the same pending entity', () => {
    beforeEach(async () => {
      blockRequests = true
      requester.engine.removeEntity(requesterEntity)
      requester.engine.removeEntity(requesterEntity)
      await tick(2)
      requester.engine.removeEntity(requesterEntity)
      await tick(2)
      blockRequests = false
      allowDeletion = true
      await tick(6, 0.5)
    })

    it('should coalesce the calls into one attempt and one outcome', () => {
      expect(new Set(requests().map(requestId)).size).toBe(1)
      expect(onResult).toHaveBeenCalledTimes(1)
      expect(onResult.mock.calls[0][0].status).toBe('accepted')
    })
  })

  describe('and a listener unsubscribes before the result', () => {
    beforeEach(async () => {
      unsubscribe()
      allowDeletion = true
      requester.engine.removeEntity(requesterEntity)
      await tick()
    })

    it('should still synchronize deletion without notifying the removed listener', () => {
      expect(onResult).not.toHaveBeenCalled()
      expect([
        requester.Transform.has(requesterEntity),
        server.Transform.has(serverEntity),
        observer.Transform.has(observerEntity)
      ]).toEqual([false, false, false])
    })
  })

  describe('and one result listener throws', () => {
    let throwingListener: jest.Mock
    let removeThrowingListener: () => void

    beforeEach(async () => {
      unsubscribe()
      throwingListener = jest.fn().mockImplementation(() => {
        throw new Error('listener failure')
      })
      jest.spyOn(console, 'error').mockImplementation(() => {})
      removeThrowingListener = requester.sync.onEntityRemovalResult(throwingListener)
      unsubscribe = requester.sync.onEntityRemovalResult(onResult)
      allowDeletion = true
      requester.engine.removeEntity(requesterEntity)
      await tick()
    })

    afterEach(() => {
      removeThrowingListener()
    })

    it('should notify the other listener and finish deletion', () => {
      expect(throwingListener).toHaveBeenCalledTimes(1)
      expect(onResult.mock.calls.map(([result]) => result.status)).toEqual(['accepted'])
      expect(requester.Transform.has(requesterEntity)).toBe(false)
    })
  })

  describe('and a rejection listener immediately retries the deletion', () => {
    beforeEach(async () => {
      onResult.mockImplementation((result) => {
        if (result.status === 'rejected') {
          allowDeletion = true
          requester.engine.removeEntity(requesterEntity)
        }
      })
      requester.engine.removeEntity(requesterEntity)
      await tick(12)
    })

    it('should complete the fresh attempt without losing it to cleanup of the rejected one', () => {
      expect(onResult.mock.calls.map(([result]) => result.status)).toEqual(['rejected', 'accepted'])
      expect(new Set(onResult.mock.calls.map(([result]) => result.requestId)).size).toBe(2)
      expect(requester.Transform.has(requesterEntity)).toBe(false)
    })
  })

  describe('and a timeout listener immediately retries after delivery resumes', () => {
    beforeEach(async () => {
      blockRequests = true
      onResult.mockImplementation((result) => {
        if (result.status === 'timeout') {
          allowDeletion = true
          blockRequests = false
          requester.engine.removeEntity(requesterEntity)
        }
      })
      requester.engine.removeEntity(requesterEntity)
      await tick(16, 1)
    })

    it('should complete a new attempt after reporting the timed-out one', () => {
      expect(onResult.mock.calls.map(([result]) => result.status)).toEqual(['timeout', 'accepted'])
      expect(new Set(onResult.mock.calls.map(([result]) => result.requestId)).size).toBe(2)
      expect(requester.Transform.has(requesterEntity)).toBe(false)
    })
  })
})
