import {
  Engine,
  IEngine,
  Transform,
  NetworkEntity,
  NetworkParent,
  SyncComponents,
  EngineInfo,
  GltfContainer,
  CrdtMessage,
  CrdtMessageType,
  Entity
} from '../../../packages/@dcl/ecs/dist'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { addSyncTransport } from '../../../packages/@dcl/sdk/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../packages/@dcl/sdk/network/binary-message-bus'
import { createRendererTransport } from '../../../packages/@dcl/sdk/internal/transports/rendererTransport'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { readMessage } from '../../../packages/@dcl/ecs/src/serialization/crdt/message'
import { EntityState, PutNetworkComponentOperation } from '../../../packages/@dcl/ecs/src'

function defineComponents(engine: IEngine) {
  return {
    Transform: components.Transform(engine as any) as any as typeof Transform,
    NetworkEntity: components.NetworkEntity(engine as any) as any as typeof NetworkEntity,
    NetworkParent: components.NetworkParent(engine as any) as any as typeof NetworkParent,
    SyncComponents: components.SyncComponents(engine as any) as any as typeof SyncComponents,
    EngineInfo: components.EngineInfo(engine as any) as any as typeof EngineInfo,
    GltfContainer: components.GltfContainer(engine as any) as any as typeof GltfContainer
  }
}

describe('Network Parenting', () => {
  const engineA = Engine()
  const engineB = Engine()
  const interceptedMessages: any[] = []

  function intercept(data: Uint8Array, direction: string) {
    const buffer = new ReadWriteByteBuffer(data, 0)

    let msg: CrdtMessage | null
    while ((msg = readMessage(buffer))) {
      interceptedMessages.push({
        ...msg,
        direction
      })
    }
  }

  async function tick() {
    await Promise.all([engineA.update(1), engineB.update(1)])
  }

  const componentsA = defineComponents(engineA)
  const componentsB = defineComponents(engineB)
  // Client Tranports
  const sendBatchA = {
    crdtSendToRenderer: async (msg: { data: Uint8Array }) => {
      intercept(msg.data, 'a->renderer')
      return { data: [] }
    }
  }
  const sendBatchB = {
    crdtSendToRenderer: async (msg: { data: Uint8Array }) => {
      intercept(msg.data, 'b->renderer')
      return { data: [] }
    }
  }
  engineA.addTransport(createRendererTransport(sendBatchA))
  engineB.addTransport(createRendererTransport(sendBatchB))

  // Network Transports
  const messagesA: Uint8Array[] = []
  const messagesB: Uint8Array[] = []

  const sendBinaryA = async (msg: { data: Uint8Array[] }) => {
    for (const value of msg.data) {
      const messageType = value.subarray(0, 1)[0]
      if (messageType === CommsMessage.CRDT) {
        const crdtMessage = value.subarray(1)
        intercept(crdtMessage, 'a->b')
      }
    }
    messagesB.push(...msg.data)
    const messages = [...messagesA].map(($) => {
      const senderBytes = encodeString('B')
      const serializedMessage = new Uint8Array($.byteLength + senderBytes.byteLength + 1)
      serializedMessage.set(new Uint8Array([senderBytes.byteLength]), 0)
      serializedMessage.set(senderBytes, 1)
      serializedMessage.set($, senderBytes.byteLength + 1)
      return serializedMessage
    })
    messagesA.length = 0
    return { data: messages }
  }
  const sendBinaryB = async (msg: { data: Uint8Array[] }) => {
    for (const value of msg.data) {
      const messageType = value.subarray(0, 1)[0]
      if (messageType === CommsMessage.CRDT) {
        const crdtMessage = value.subarray(1)
        intercept(crdtMessage, 'b->a')
      }
    }

    messagesA.push(...msg.data)
    const messages = [...messagesB].map(($) => {
      const senderBytes = encodeString('A')
      const serializedMessage = new Uint8Array($.byteLength + senderBytes.byteLength + 1)
      serializedMessage.set(new Uint8Array([senderBytes.byteLength]), 0)
      serializedMessage.set(senderBytes, 1)
      serializedMessage.set($, senderBytes.byteLength + 1)
      return serializedMessage
    })
    messagesB.length = 0
    return { data: messages }
  }
  const syncA = addSyncTransport(engineA, sendBinaryA, async () => ({
    data: { userId: 'A', version: 1, displayName: '1', hasConnectedWeb3: true, avatar: undefined }
  }))
  const syncB = addSyncTransport(engineB, sendBinaryB, async () => ({
    data: { userId: 'B', version: 1, displayName: '1', hasConnectedWeb3: true, avatar: undefined }
  }))
  let entityCache: Entity
  const buffer = new ReadWriteByteBuffer()
  it('should get the engines ready', async () => {
    componentsA.EngineInfo.create(engineA.RootEntity, { tickNumber: 400, frameNumber: 400, totalRuntime: 1 })
    componentsB.EngineInfo.create(engineB.RootEntity, { tickNumber: 400, frameNumber: 400, totalRuntime: 1 })
    // Dance of sync
    await tick()
    await tick()
    await tick()
    interceptedMessages.length = 0
  })
  it('creates a local entity so we have a missmatch of entities ids for both engines', async () => {
    engineA.addEntity()
    engineA.addEntity()
  })
  it('should create a sync entity in A', async () => {
    entityCache = engineA.addEntity()
    componentsA.Transform.create(entityCache, { position: { x: 8, y: 8, z: 8 } })
    syncA.syncEntity(entityCache, [componentsA.Transform.componentId])
    await tick()
  })
  it('should have sent a message to engine B & renderer', async () => {
    componentsA.Transform.schema.serialize(
      {
        position: { x: 8, y: 8, z: 8 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        parent: 0 as Entity
      },
      buffer
    )
    const rendererMessage = {
      direction: 'a->renderer',
      componentId: componentsA.Transform.componentId,
      entityId: entityCache,
      type: CrdtMessageType.PUT_COMPONENT,
      timestamp: 1,
      data: buffer.toCopiedBinary()
    }
    const networkMessage = {
      direction: 'a->b',
      componentId: componentsA.Transform.componentId,
      entityId: entityCache,
      type: CrdtMessageType.PUT_COMPONENT_NETWORK,
      timestamp: 1,
      networkId: syncA.myProfile.networkId,
      data: undefined
    }
    const transformMessage = { ...networkMessage, data: buffer.toCopiedBinary() }

    // Create NetworkEntity message
    buffer.resetBuffer()
    componentsA.NetworkEntity.schema.serialize({ entityId: entityCache, networkId: syncA.myProfile.networkId }, buffer)
    const networkEntityMessage = {
      ...networkMessage,
      componentId: componentsA.NetworkEntity.componentId,
      data: buffer.toCopiedBinary()
    }

    // Create SyncComponent Message
    buffer.resetBuffer()
    componentsA.SyncComponents.schema.serialize({ componentIds: [componentsA.Transform.componentId] }, buffer)
    const syncComponentMessage = {
      ...networkMessage,
      componentId: componentsA.SyncComponents.componentId,
      data: buffer.toCopiedBinary()
    }
    expect(interceptedMessages).toMatchObject([
      rendererMessage,
      transformMessage,
      networkEntityMessage,
      syncComponentMessage
    ])
    interceptedMessages.length = 0
  })
  it('should add that entity to the engine B', async () => {
    const transforms = Array.from(engineB.getEntitiesWith(componentsB.Transform))
    expect(transforms).toMatchObject([])
    await tick()
    const [entity, transform] = Array.from(engineB.getEntitiesWith(componentsB.Transform))[0]
    expect(componentsB.NetworkEntity.get(entity)).toMatchObject({
      networkId: syncA.myProfile.networkId,
      entityId: entityCache
    })
    expect(transform).toMatchObject({ position: { x: 8, y: 8, z: 8 } })
    expect(componentsB.SyncComponents.get(entity)).toMatchObject({ componentIds: [componentsB.Transform.componentId] })
    expect(entity).not.toBe(entityCache)
    expect(interceptedMessages).toMatchObject([
      {
        timestamp: 1,
        componentId: componentsB.Transform.componentId,
        direction: 'b->renderer',
        entityId: entity
      }
    ])
    interceptedMessages.length = 0
  })
  it('B modifies the network entity', async () => {
    const [entity] = Array.from(engineB.getEntitiesWith(componentsB.Transform))[0]
    componentsB.Transform.getMutable(entity).position.x = 88
    await tick()
    expect(interceptedMessages).toMatchObject([
      {
        componentId: componentsB.Transform.componentId,
        timestamp: 2,
        direction: 'b->renderer',
        type: CrdtMessageType.PUT_COMPONENT,
        entityId: entity
      },
      {
        componentId: componentsB.Transform.componentId,
        timestamp: 2,
        direction: 'b->a',
        type: CrdtMessageType.PUT_COMPONENT_NETWORK,
        entityId: entityCache
      }
    ])
    interceptedMessages.length = 0
    await tick()
  })
  it('A receives the update', async () => {
    // Process the message & send it to the renderer
    await tick()
    expect(componentsA.Transform.get(entityCache).position.x).toBe(88)
    expect(interceptedMessages).toMatchObject([
      {
        componentId: componentsA.Transform.componentId,
        timestamp: 2,
        direction: 'a->renderer',
        type: CrdtMessageType.PUT_COMPONENT,
        entityId: entityCache
      }
    ])
    interceptedMessages.length = 0
  })
  it('a new tick should not create new messages', async () => {
    await tick()
    expect(interceptedMessages).toMatchObject([])
  })
  it('B adds a parenting to the network entity', async () => {
    const [childEntity, transform] = Array.from(engineB.getEntitiesWith(componentsB.Transform))[0]
    const parent = engineB.addEntity()

    componentsB.Transform.create(parent)
    syncB.syncEntity(parent, [componentsA.Transform.componentId])
    syncB.parentEntity(childEntity, parent)

    // The parent goes through the NetworkParent component, be sure that the parent property is the same as before.
    expect(componentsB.Transform.get(childEntity).parent).toBe(0)
    await tick()

    // b->renderer [new entity] Transform
    expect(interceptedMessages[0]).toMatchObject({
      componentId: componentsA.Transform.componentId,
      timestamp: 1,
      entityId: parent,
      direction: 'b->renderer',
      type: CrdtMessageType.PUT_COMPONENT
    })

    // Child Transform WITH parent for the renderer
    buffer.resetBuffer()
    componentsA.Transform.schema.serialize({ ...transform, parent }, buffer)
    const childTransform = buffer.toCopiedBinary()
    expect(interceptedMessages[1]).toMatchObject(
      // b->renderer [old entity] Transform with parent
      {
        componentId: componentsA.Transform.componentId,
        timestamp: 3,
        entityId: childEntity,
        data: childTransform,
        direction: 'b->renderer',
        type: CrdtMessageType.PUT_COMPONENT
      }
    )

    expect(interceptedMessages[2]).toMatchObject(
      // b->a [new entity] Transform
      {
        componentId: componentsA.Transform.componentId,
        timestamp: 1,
        networkId: syncB.myProfile.networkId,
        entityId: parent,
        direction: 'b->a',
        type: CrdtMessageType.PUT_COMPONENT_NETWORK
      }
    )
    // Child Transform WITHOUT parent for network (b->a)
    buffer.resetBuffer()
    componentsA.Transform.schema.serialize(transform, buffer)
    const childNetworkTransform = buffer.toCopiedBinary()
    expect(interceptedMessages[3]).toMatchObject({
      // b->a [old entity] same Transform without parent
      componentId: componentsA.Transform.componentId,
      timestamp: 3,
      networkId: syncA.myProfile.networkId,
      entityId: entityCache,
      data: childNetworkTransform,
      direction: 'b->a',
      type: CrdtMessageType.PUT_COMPONENT_NETWORK
    })

    expect(interceptedMessages[4]).toMatchObject({
      componentId: componentsA.NetworkEntity.componentId,
      timestamp: 1,
      networkId: syncB.myProfile.networkId,
      entityId: parent,
      direction: 'b->a',
      type: CrdtMessageType.PUT_COMPONENT_NETWORK
    })

    // NetworkParent
    buffer.resetBuffer()
    componentsA.NetworkParent.schema.serialize({ networkId: syncB.myProfile.networkId, entityId: parent }, buffer)
    const networkParent = buffer.toCopiedBinary()
    expect(interceptedMessages[5]).toMatchObject(
      // b->a [old entity] new ParentNetwork component
      {
        componentId: componentsA.NetworkParent.componentId,
        timestamp: 1,
        networkId: syncA.myProfile.networkId,
        entityId: entityCache,
        data: networkParent,
        direction: 'b->a',
        type: CrdtMessageType.PUT_COMPONENT_NETWORK
      }
    )
    await tick()
    interceptedMessages.length = 0
  })
  it('should send the new parent to the renderer (A)', async () => {
    await tick()
    const transform = componentsA.Transform.get(entityCache)
    expect(transform.parent).toBe(0)
    // new entity add by the message created from client b (parent entity)
    const parentEntity = (entityCache + 1) as Entity

    // Parent Transform without parent
    buffer.resetBuffer()
    componentsA.Transform.schema.serialize(componentsA.Transform.get(parentEntity), buffer)
    const parentTransform = buffer.toCopiedBinary()

    // Child Transform WITH parent for the renderer
    buffer.resetBuffer()
    componentsA.Transform.schema.serialize({ ...transform, parent: parentEntity }, buffer)
    const childTransform = buffer.toCopiedBinary()

    expect(interceptedMessages).toMatchObject([
      {
        componentId: componentsA.Transform.componentId,
        timestamp: 1,
        entityId: parentEntity,
        data: parentTransform,
        direction: 'a->renderer',
        type: CrdtMessageType.PUT_COMPONENT
      },
      {
        componentId: componentsA.Transform.componentId,
        timestamp: 3,
        entityId: entityCache,
        data: childTransform,
        direction: 'a->renderer',
        type: CrdtMessageType.PUT_COMPONENT
      }
    ])
    interceptedMessages.length = 0
    await tick()
  })
  it('should create a component so then we can remove it', async () => {
    componentsA.GltfContainer.create(entityCache, { src: 'boedo' })
    componentsA.SyncComponents.getMutable(entityCache).componentIds = [
      componentsA.Transform.componentId,
      componentsA.GltfContainer.componentId
    ]
    await tick()
  })
  it('should receive the gltf container', async () => {
    await tick()
    const [childEntity] = Array.from(engineB.getEntitiesWith(componentsB.Transform))[0]
    expect(componentsB.GltfContainer.get(childEntity).src).toBe('boedo')
    interceptedMessages.length = 0
  })
  it('should remove the component on B', async () => {
    const [childEntity] = Array.from(engineB.getEntitiesWith(componentsB.Transform))[0]
    componentsB.GltfContainer.deleteFrom(childEntity)
    await tick()
    expect(interceptedMessages).toMatchObject([
      {
        direction: 'b->renderer',
        componentId: componentsB.GltfContainer.componentId,
        timestamp: 2,
        type: CrdtMessageType.DELETE_COMPONENT,
        entityId: childEntity
      },
      {
        direction: 'b->a',
        componentId: componentsB.GltfContainer.componentId,
        timestamp: 2,
        type: CrdtMessageType.DELETE_COMPONENT_NETWORK,
        entityId: entityCache,
        networkId: syncA.myProfile.networkId
      }
    ])
    interceptedMessages.length = 0
    await tick()
  })
  it('should remove the gltf container on A', async () => {
    await tick()
    expect(componentsA.GltfContainer.getOrNull(entityCache)).toBe(null)
    interceptedMessages.length = 0
  })
  it('should serialize PutComponentNetwork', async () => {
    componentsA.Transform.getMutable(entityCache).position.y = 88
    buffer.resetBuffer()
    componentsA.Transform.schema.serialize(
      {
        position: { x: 88, y: 88, z: 8 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        parent: 0 as Entity
      },
      buffer
    )
    const transformData = buffer.toCopiedBinary()
    buffer.resetBuffer()
    PutNetworkComponentOperation.write(
      entityCache,
      4,
      componentsA.Transform.componentId,
      syncA.myProfile.networkId,
      transformData,
      buffer
    )
    await tick()
    expect(interceptedMessages[1]).toMatchObject(readMessage(buffer)!)
    await tick()
    interceptedMessages.length = 0
  })
  it('should remove the parent with the childrens', async () => {
    const parentEntity = (entityCache + 1) as Entity
    engineA.removeEntityWithChildren(parentEntity)
    await tick()
    expect(interceptedMessages).toMatchObject([
      {
        direction: 'a->renderer',
        type: CrdtMessageType.DELETE_COMPONENT,
        componentId: componentsA.Transform.componentId,
        timestamp: 2,
        entityId: parentEntity
      },
      {
        direction: 'a->renderer',
        type: CrdtMessageType.DELETE_COMPONENT,
        componentId: componentsA.Transform.componentId,
        timestamp: 5,
        entityId: entityCache
      },
      {
        direction: 'a->renderer',
        type: CrdtMessageType.DELETE_ENTITY,
        entityId: parentEntity
      },
      {
        direction: 'a->renderer',
        type: CrdtMessageType.DELETE_ENTITY,
        entityId: entityCache
      },
      {
        direction: 'a->b',
        type: CrdtMessageType.DELETE_ENTITY_NETWORK,
        entityId: componentsA.NetworkEntity.get(parentEntity).entityId,
        networkId: syncB.myProfile.networkId
      },
      {
        direction: 'a->b',
        type: CrdtMessageType.DELETE_ENTITY_NETWORK,
        entityId: entityCache,
        networkId: syncA.myProfile.networkId
      }
    ])
    interceptedMessages.length = 0
  })
  it('should remove the entities on engine B', async () => {
    const transformEntities = Array.from(engineB.getEntitiesWith(componentsB.Transform))
    const [childEntity] = transformEntities[0]
    const [parentEntity] = transformEntities[1]
    await tick()
    expect(engineB.getEntityState(childEntity)).toBe(EntityState.Removed)
    expect(engineB.getEntityState(parentEntity)).toBe(EntityState.Removed)
    interceptedMessages.length = 0
  })
})
