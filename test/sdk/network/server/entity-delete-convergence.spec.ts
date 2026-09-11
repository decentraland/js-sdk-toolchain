import { Engine, IEngine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity, EntityState, EntityUtils } from '../../../../packages/@dcl/ecs/src/engine/entity'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { addSyncTransport, AUTH_SERVER_PEER_ID } from '../../../../packages/@dcl/sdk/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../../packages/@dcl/sdk/network/binary-message-bus'

import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { DeleteEntityNetwork } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/deleteEntityNetwork'

type Peer = {
  address: string
  engine: IEngine
  inbox: Uint8Array[]
  Transform: ReturnType<typeof components.Transform>
  NetworkEntity: ReturnType<typeof components.NetworkEntity>
  NetworkParent: ReturnType<typeof components.NetworkParent>
  SyncComponents: ReturnType<typeof components.SyncComponents>
  UiText: ReturnType<typeof components.UiText>
}

describe('when a client requests deletion through its synchronization transport', () => {
  let peers: Peer[]
  let requester: Peer
  let server: Peer
  let observer: Peer
  let requesterEntity: Entity
  let serverEntity: Entity
  let observerEntity: Entity
  let requesterChild: Entity
  let serverChild: Entity
  let localChild: Entity
  let localValue: ReturnType<Peer['UiText']['getMutable']>
  let transformValue: ReturnType<Peer['Transform']['getMutable']>
  let networkValue: ReturnType<Peer['NetworkEntity']['getMutable']>
  let onTransformChange: jest.Mock
  let allowDeletion: boolean
  let deliverToServer: boolean
  let dropServerResponse: boolean
  let serverMessages: Uint8Array[]

  function createPeer(address: string, roleResponse?: Promise<{ isServer: boolean }>): Peer {
    const engine = Engine()
    const peer: Peer = {
      address,
      engine,
      inbox: [],
      Transform: components.Transform(engine),
      NetworkEntity: components.NetworkEntity(engine),
      NetworkParent: components.NetworkParent(engine),
      SyncComponents: components.SyncComponents(engine),
      UiText: components.UiText(engine)
    }
    addSyncTransport(
      engine,
      async (message) => {
        for (const packet of message.peerData ?? []) {
          for (const data of packet.data ?? []) {
            if (peer === server) serverMessages.push(data)
            const sender = encodeString(address)
            const framed = new Uint8Array(1 + sender.length + data.length)
            framed[0] = sender.length
            framed.set(sender, 1)
            framed.set(data, 1 + sender.length)
            for (const recipient of peers) {
              if (recipient === peer || (packet.address.length && !packet.address.includes(recipient.address))) continue
              if (dropServerResponse && peer === server && recipient === requester) continue
              recipient.inbox.push(framed)
            }
          }
        }
        return { data: peer === server && !deliverToServer ? [] : peer.inbox.splice(0) }
      },
      async () => ({ data: { userId: address, version: 1, displayName: address, hasConnectedWeb3: true } }),
      async () => roleResponse ?? { isServer: address === AUTH_SERVER_PEER_ID },
      address
    )
    peers.push(peer)
    return peer
  }

  function findEntity(peer: Peer, networkEntityId: number, networkId: number = 7): Entity {
    const entity = Array.from(peer.engine.getEntitiesWith(peer.NetworkEntity)).find(
      ([, network]) => network.networkId === networkId && network.entityId === networkEntityId
    )
    if (!entity) throw new Error(`Missing network entity ${networkEntityId} on ${peer.address}`)
    return entity[0]
  }

  async function tick(count: number = 6): Promise<void> {
    for (let frame = 0; frame < count; frame++) {
      for (const peer of peers) await peer.engine.update(0.1)
    }
  }

  beforeEach(async () => {
    peers = []
    serverMessages = []
    allowDeletion = false
    deliverToServer = true
    dropServerResponse = false
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
    serverChild = server.engine.addEntity()
    server.Transform.create(serverChild)
    server.NetworkEntity.create(serverChild, { networkId: 7, entityId: 101 as Entity })
    server.SyncComponents.create(serverChild, { componentIds: [server.Transform.componentId] })
    server.NetworkParent.create(serverChild, { networkId: 7, entityId: 100 as Entity })
    await tick()
    requesterEntity = findEntity(requester, 100)
    observerEntity = findEntity(observer, 100)
    requesterChild = findEntity(requester, 101)
    requester.UiText.create(requesterEntity, { value: 'local interaction state' })
    localChild = requester.engine.addEntity()
    requester.Transform.create(localChild, { parent: requesterEntity })
    await tick()
    localValue = requester.UiText.getMutable(requesterEntity)
    transformValue = requester.Transform.getMutable(requesterEntity)
    networkValue = requester.NetworkEntity.getMutable(requesterEntity)
    onTransformChange = jest.fn()
    requester.Transform.onChange(requesterEntity, onTransformChange)
    server.Transform.validateBeforeChange(({ newValue }) => newValue !== undefined || allowDeletion)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    peers.length = 0
  })

  describe('and the server rejects the request', () => {
    beforeEach(async () => {
      requester.engine.removeEntity(requesterEntity)
      await tick()
    })

    it('should keep the original entity alive on every participant', () => {
      expect([
        requester.engine.getEntityState(requesterEntity),
        server.engine.getEntityState(serverEntity),
        observer.engine.getEntityState(observerEntity)
      ]).toEqual([EntityState.UsedEntity, EntityState.UsedEntity, EntityState.UsedEntity])
    })

    it('should retain the same component objects and local-only state', () => {
      expect(requester.Transform.getMutable(requesterEntity)).toBe(transformValue)
      expect(requester.NetworkEntity.getMutable(requesterEntity)).toBe(networkValue)
      expect(requester.UiText.getMutable(requesterEntity)).toBe(localValue)
    })

    it('should retain child references to the original entity', () => {
      expect(requester.Transform.get(localChild).parent).toBe(requesterEntity)
      expect(requester.NetworkParent.get(requesterChild)).toEqual(networkValue)
    })

    it('should not notify component listeners of a deletion', () => {
      expect(onTransformChange).not.toHaveBeenCalledWith(undefined)
    })

    describe('and the server subsequently changes the retained entity', () => {
      beforeEach(async () => {
        server.Transform.getMutable(serverEntity).position.x = 12
        await tick()
      })

      it('should continue notifying the original component listener', () => {
        expect(onTransformChange).toHaveBeenCalledWith(expect.objectContaining({ position: { x: 12, y: 5, z: 6 } }))
      })
    })

    describe('and the scene retries after deletion becomes permitted', () => {
      beforeEach(async () => {
        allowDeletion = true
        requester.engine.removeEntity(requesterEntity)
        await tick()
      })

      it('should remove the entity from all participants', () => {
        expect([
          requester.Transform.has(requesterEntity),
          server.Transform.has(serverEntity),
          observer.Transform.has(observerEntity)
        ]).toEqual([false, false, false])
      })
    })
  })

  describe('and the server accepts the request', () => {
    beforeEach(() => {
      allowDeletion = true
      requester.engine.removeEntity(requesterEntity)
    })

    it('should keep the requester state until the authoritative response arrives', () => {
      expect(requester.Transform.getMutable(requesterEntity)).toBe(transformValue)
      expect(requester.UiText.getMutable(requesterEntity)).toBe(localValue)
    })

    describe('and the accepted deletion is delivered', () => {
      beforeEach(async () => {
        await tick()
      })

      it('should remove the entity and local components on every participant', () => {
        expect([
          requester.Transform.has(requesterEntity),
          server.Transform.has(serverEntity),
          observer.Transform.has(observerEntity),
          requester.UiText.has(requesterEntity)
        ]).toEqual([false, false, false, false])
        expect([
          requester.engine.getEntityState(requesterEntity),
          server.engine.getEntityState(serverEntity),
          observer.engine.getEntityState(observerEntity)
        ]).toEqual([EntityState.Removed, EntityState.Removed, EntityState.Removed])
      })
    })
  })

  describe('and server delivery is delayed', () => {
    beforeEach(async () => {
      allowDeletion = true
      deliverToServer = false
      requester.engine.removeEntity(requesterEntity)
      requester.engine.removeEntity(requesterEntity)
      await tick(30)
    })

    it('should retain the same entity and components throughout the delay', () => {
      expect(requester.engine.getEntityState(requesterEntity)).toBe(EntityState.UsedEntity)
      expect(requester.Transform.getMutable(requesterEntity)).toBe(transformValue)
      expect(requester.UiText.getMutable(requesterEntity)).toBe(localValue)
    })

    describe('and the server receives the repeated requests', () => {
      beforeEach(async () => {
        deliverToServer = true
        await tick()
      })

      it('should converge after the server accepts deletion', () => {
        expect([
          requester.Transform.has(requesterEntity),
          server.Transform.has(serverEntity),
          observer.Transform.has(observerEntity)
        ]).toEqual([false, false, false])
      })
    })
  })

  describe('and the client removes an unsynchronized entity', () => {
    beforeEach(() => {
      requester.engine.removeEntity(localChild)
    })

    it('should remove its components immediately', () => {
      expect(requester.Transform.has(localChild)).toBe(false)
    })
  })

  describe('and the authoritative server removes its own entity', () => {
    beforeEach(() => {
      server.engine.removeEntity(serverEntity)
    })

    it('should remove its components immediately', () => {
      expect(server.Transform.has(serverEntity)).toBe(false)
    })
  })

  describe('and the client requests removal with network children', () => {
    beforeEach(async () => {
      requester.engine.removeEntityWithChildren(requesterEntity)
      await tick()
    })

    it('should preserve both entities after their deletion is rejected', () => {
      expect([requester.Transform.has(requesterEntity), requester.Transform.has(requesterChild)]).toEqual([true, true])
    })

    describe('and the client retries after deletion becomes permitted', () => {
      beforeEach(async () => {
        allowDeletion = true
        requester.engine.removeEntityWithChildren(requesterEntity)
        await tick()
      })

      it('should remove both entities after the server accepts them', () => {
        expect([
          requester.Transform.has(requesterEntity),
          requester.Transform.has(requesterChild),
          server.Transform.has(serverEntity),
          server.Transform.has(serverChild)
        ]).toEqual([false, false, false, false])
      })
    })
  })

  describe('and the client creates, synchronizes, and removes an entity in one tick', () => {
    let newEntity: Entity

    beforeEach(async () => {
      allowDeletion = true
      newEntity = requester.engine.addEntity()
      requester.Transform.create(newEntity, { position: { x: 1, y: 2, z: 3 } })
      requester.NetworkEntity.create(newEntity, { networkId: 7, entityId: 102 as Entity })
      requester.SyncComponents.create(newEntity, { componentIds: [requester.Transform.componentId] })
      requester.engine.removeEntity(newEntity)
      await tick()
    })

    it('should announce the entity before processing its deletion', () => {
      expect(requester.Transform.has(newEntity)).toBe(false)
      expect(
        Array.from(server.engine.getEntitiesWith(server.NetworkEntity)).some(([, network]) => network.entityId === 102)
      ).toBe(false)
      expect(
        Array.from(observer.engine.getEntitiesWith(observer.NetworkEntity)).some(
          ([, network]) => network.entityId === 102
        )
      ).toBe(false)
    })
  })

  describe('and the client creates and removes a protected entity in one tick', () => {
    let newEntity: Entity

    beforeEach(async () => {
      newEntity = requester.engine.addEntity()
      requester.Transform.create(newEntity, { position: { x: 1, y: 2, z: 3 } })
      requester.NetworkEntity.create(newEntity, { networkId: 7, entityId: 102 as Entity })
      requester.SyncComponents.create(newEntity, { componentIds: [requester.Transform.componentId] })
      requester.engine.removeEntity(newEntity)
      await tick()
    })

    it('should validate the announced components before accepting the deletion', () => {
      expect([
        requester.Transform.has(newEntity),
        Array.from(server.engine.getEntitiesWith(server.NetworkEntity, server.Transform)).some(
          ([, network]) => network.entityId === 102
        ),
        Array.from(observer.engine.getEntitiesWith(observer.NetworkEntity, observer.Transform)).some(
          ([, network]) => network.entityId === 102
        )
      ]).toEqual([true, true, true])
    })
  })

  describe('and the accepted broadcast does not reach the requester', () => {
    beforeEach(async () => {
      allowDeletion = true
      dropServerResponse = true
      requester.engine.removeEntity(requesterEntity)
      await tick()
    })

    it('should retain the requester state while the server and observer have removed theirs', () => {
      expect([
        requester.Transform.has(requesterEntity),
        server.Transform.has(serverEntity),
        observer.Transform.has(observerEntity)
      ]).toEqual([true, false, false])
    })

    describe('and the requester changes the entity before learning about its deletion', () => {
      beforeEach(async () => {
        requester.Transform.getMutable(requesterEntity).position.x = 25
        await tick()
      })

      it('should not resurrect the retired network identity on the server or observer', () => {
        expect([
          Array.from(server.engine.getEntitiesWith(server.NetworkEntity)).some(
            ([, network]) => network.entityId === 100
          ),
          Array.from(observer.engine.getEntitiesWith(observer.NetworkEntity)).some(
            ([, network]) => network.entityId === 100
          )
        ]).toEqual([false, false])
      })
    })

    describe('and the client creates a newer version of the retired network entity', () => {
      let newEntity: Entity
      let newNetworkEntity: Entity

      beforeEach(async () => {
        dropServerResponse = false
        newNetworkEntity = EntityUtils.toEntityId(100, 1)
        newEntity = requester.engine.addEntity()
        requester.Transform.create(newEntity, { position: { x: 30, y: 0, z: 0 } })
        requester.NetworkEntity.create(newEntity, { networkId: 7, entityId: newNetworkEntity })
        requester.SyncComponents.create(newEntity, { componentIds: [requester.Transform.componentId] })
        await tick()
      })

      it('should synchronize the newer entity version to the server and observer', () => {
        expect(server.Transform.get(findEntity(server, newNetworkEntity)).position.x).toBe(30)
        expect(observer.Transform.get(findEntity(observer, newNetworkEntity)).position.x).toBe(30)
      })
    })

    describe('and the requester retries after delivery resumes', () => {
      beforeEach(async () => {
        dropServerResponse = false
        requester.engine.removeEntity(requesterEntity)
        await tick(20)
      })

      it('should accept the retry without recreating the deleted entity', () => {
        expect(requester.Transform.has(requesterEntity)).toBe(false)
        expect(
          Array.from(server.engine.getEntitiesWith(server.NetworkEntity)).some(
            ([, network]) => network.entityId === 100
          )
        ).toBe(false)
        expect(
          Array.from(observer.engine.getEntitiesWith(observer.NetworkEntity)).some(
            ([, network]) => network.entityId === 100
          )
        ).toBe(false)
      })
    })
  })

  describe('and a client update races with a server-local deletion', () => {
    beforeEach(async () => {
      dropServerResponse = true
      server.engine.removeEntity(serverEntity)
      requester.Transform.getMutable(requesterEntity).position.x = 25
      await tick()
    })

    it('should not recreate the entity from the late client update', () => {
      expect([
        Array.from(server.engine.getEntitiesWith(server.NetworkEntity, server.Transform)).some(
          ([, network]) => network.entityId === 100
        ),
        Array.from(observer.engine.getEntitiesWith(observer.NetworkEntity, observer.Transform)).some(
          ([, network]) => network.entityId === 100
        )
      ]).toEqual([false, false])
    })
  })

  describe('and a starting client has not received its runtime role', () => {
    let startingPeer: Peer
    let startingEntity: Entity
    let roleResponse: Promise<{ isServer: boolean }>
    let resolveRole: (value: { isServer: boolean }) => void

    beforeEach(async () => {
      allowDeletion = true
      roleResponse = new Promise((resolve) => {
        resolveRole = resolve
      })
      startingPeer = createPeer('starting-client', roleResponse)
      startingEntity = startingPeer.engine.addEntity()
      startingPeer.Transform.create(startingEntity)
      startingPeer.NetworkEntity.create(startingEntity, { networkId: 7, entityId: 100 as Entity })
      startingPeer.SyncComponents.create(startingEntity, { componentIds: [startingPeer.Transform.componentId] })
      startingPeer.engine.removeEntity(startingEntity)
      await tick()
    })

    it('should retain the entity while its runtime role is unresolved', () => {
      expect(startingPeer.Transform.has(startingEntity)).toBe(true)
    })

    describe('and the runtime identifies the participant as a client', () => {
      beforeEach(async () => {
        resolveRole({ isServer: false })
        await tick()
      })

      it('should submit the pending deletion and apply the accepted response', () => {
        expect([
          startingPeer.Transform.has(startingEntity),
          server.Transform.has(serverEntity),
          observer.Transform.has(observerEntity)
        ]).toEqual([false, false, false])
      })
    })
  })

  describe('and independent shared entity IDs overlap in their low 16 bits', () => {
    let firstSharedEntity: Entity
    let secondSharedEntity: Entity
    let requesterFirstSharedEntity: Entity
    let observerFirstSharedEntity: Entity

    beforeEach(async () => {
      allowDeletion = true
      firstSharedEntity = server.engine.addEntity()
      secondSharedEntity = server.engine.addEntity()
      server.Transform.create(firstSharedEntity)
      server.Transform.create(secondSharedEntity)
      server.NetworkEntity.create(firstSharedEntity, { networkId: 0, entityId: 1 as Entity })
      server.NetworkEntity.create(secondSharedEntity, { networkId: 0, entityId: 65537 as Entity })
      server.SyncComponents.create(firstSharedEntity, { componentIds: [server.Transform.componentId] })
      server.SyncComponents.create(secondSharedEntity, { componentIds: [server.Transform.componentId] })
      await tick()
      requesterFirstSharedEntity = findEntity(requester, 1, 0)
      observerFirstSharedEntity = findEntity(observer, 1, 0)
      requester.engine.removeEntity(findEntity(requester, 65537, 0))
      await tick()
      requester.Transform.getMutable(requesterFirstSharedEntity).position.x = 42
      await tick()
    })

    it('should keep propagating updates to the other shared entity after deletion', () => {
      expect(server.Transform.has(secondSharedEntity)).toBe(false)
      expect(server.Transform.get(firstSharedEntity).position.x).toBe(42)
      expect(observer.Transform.get(observerFirstSharedEntity).position.x).toBe(42)
    })
  })

  describe('and a peer requests deletion of an unknown network entity', () => {
    let deletion: ReadWriteByteBuffer
    let encodedSender: Uint8Array
    let framedRequest: Uint8Array

    beforeEach(async () => {
      await tick()
      serverMessages = []
      deletion = new ReadWriteByteBuffer()
      DeleteEntityNetwork.write(777 as Entity, 7, deletion)
      encodedSender = encodeString(requester.address)
      framedRequest = new Uint8Array(2 + encodedSender.length + deletion.toBinary().length)
      framedRequest[0] = encodedSender.length
      framedRequest.set(encodedSender, 1)
      framedRequest[1 + encodedSender.length] = CommsMessage.CRDT
      framedRequest.set(deletion.toBinary(), 2 + encodedSender.length)
      server.inbox.push(framedRequest)
      await tick()
    })

    it('should not acknowledge a deletion the server has never accepted', () => {
      expect(serverMessages).toEqual([])
    })
  })
})
