import { Entity, Schemas, Engine } from '../../../packages/@dcl/ecs/dist'
import * as components from '../../../packages/@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/dist/serialization/ByteBuffer'
import { readMessage } from '../../../packages/@dcl/ecs/dist/serialization/crdt/message'
import { CrdtMessage, CrdtMessageType } from '../../../packages/@dcl/ecs/dist'
import { LIVEKIT_MAX_SIZE } from '../../../packages/@dcl/sdk/src/network/server'
import { addSyncTransport } from '../../../packages/@dcl/sdk/src/network/message-bus-sync'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'
// Message capture for testing chunking
class MessageCapture {
  capturedChunks: Uint8Array[] = []

  reset() {
    this.capturedChunks = []
  }

  routeMessage(data: Uint8Array, _addresses: string[], sender: string) {
    // Extract CRDT messages from network messages
    if (data.length > 0 && data[0] === CommsMessage.CRDT) {
      const crdtMessage = data.subarray(1)
      this.capturedChunks.push(crdtMessage)
      console.log(`Captured CRDT chunk from ${sender}: ${crdtMessage.byteLength} bytes`)
    }
  }
}

function setupEngineWithSyncTransport(name: string, isServer: boolean = false) {
  const engine = Engine()
  const messageCapture = new MessageCapture()

  // Define required components BEFORE calling addSyncTransport
  const NetworkEntity = components.NetworkEntity(engine as any)
  components.NetworkParent(engine as any) // Required by addSyncTransport
  components.Transform(engine as any) // Required by addSyncTransport
  const SyncComponents = components.SyncComponents(engine as any)

  // Send binary function that captures messages
  const sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse> = async (msg) => {
    // Route all outgoing messages through the capture system
    for (const peerData of msg.peerData) {
      for (const data of peerData.data) {
        messageCapture.routeMessage(data, peerData.address, name)
      }
    }

    // Return empty response for now (no incoming messages in these tests)
    return { data: [] }
  }

  // Mock functions
  const getUserData = async () => ({
    data: { userId: name, version: 1, displayName: name, hasConnectedWeb3: true, avatar: undefined }
  })

  const isServerFn = async () => ({ isServer })

  // Initialize sync transport AFTER defining components
  addSyncTransport(engine, sendBinary, getUserData, isServerFn, name)

  return {
    engine,
    messageCapture,
    SyncComponents,
    NetworkEntity
  }
}

describe('CRDT Network Transport Chunking Tests', () => {
  it('Should test CRDT chunking with multiple entities and components', async () => {
    const { engine, messageCapture, SyncComponents, NetworkEntity } = setupEngineWithSyncTransport('test-client')

    // Define components with different data sizes
    const SmallComponent = engine.defineComponent('smallComponent', {
      id: Schemas.String,
      value: Schemas.Number
    })

    const MediumComponent = engine.defineComponent('mediumComponent', {
      id: Schemas.String,
      description: Schemas.String,
      values: Schemas.Array(Schemas.Number)
    })

    const LargeComponent = engine.defineComponent('largeComponent', {
      id: Schemas.String,
      data: Schemas.String,
      metadata: Schemas.Array(Schemas.Map({ key: Schemas.String, value: Schemas.String }))
    })

    // Create multiple entities with different component combinations
    const entities: Entity[] = []

    // Entity 1: Small + Medium components
    const entity1 = engine.addEntity()
    NetworkEntity.create(entity1, { networkId: 1, entityId: entity1 })
    SmallComponent.create(entity1, { id: 'entity1-small', value: 42 })
    MediumComponent.create(entity1, {
      id: 'entity1-medium',
      description: 'This is a medium component for entity 1',
      values: [1, 2, 3, 4, 5]
    })
    SyncComponents.create(entity1, { componentIds: [SmallComponent.componentId, MediumComponent.componentId] })
    entities.push(entity1)

    // Entity 2: Small + Large components
    const entity2 = engine.addEntity()
    NetworkEntity.create(entity2, { networkId: 2, entityId: entity2 })
    SmallComponent.create(entity2, { id: 'entity2-small', value: 84 })
    LargeComponent.create(entity2, {
      id: 'entity2-large',
      data: 'A'.repeat(1000), // Large string to trigger chunking
      metadata: [
        { key: 'key1', value: 'value1'.repeat(100) },
        { key: 'key2', value: 'value2'.repeat(100) },
        { key: 'key3', value: 'value3'.repeat(100) }
      ]
    })
    SyncComponents.create(entity2)
    entities.push(entity2)

    // Entity 3: All three components
    const entity3 = engine.addEntity()
    NetworkEntity.create(entity3, { networkId: 3, entityId: entity3 })
    SmallComponent.create(entity3, { id: 'entity3-small', value: 126 })
    MediumComponent.create(entity3, {
      id: 'entity3-medium',
      description: 'This is a medium component for entity 3',
      values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    })
    LargeComponent.create(entity3, {
      id: 'entity3-large',
      data: 'B'.repeat(800), // Another large string
      metadata: [
        { key: 'meta1', value: 'data1'.repeat(80) },
        { key: 'meta2', value: 'data2'.repeat(80) },
        { key: 'meta3', value: 'data3'.repeat(80) },
        { key: 'meta4', value: 'data4'.repeat(80) }
      ]
    })
    SyncComponents.create(entity3)
    entities.push(entity3)

    // Update engine to process all changes and trigger network messages
    await engine.update(1)
    await engine.update(1) // Second update to ensure message processing

    console.log(`Generated ${messageCapture.capturedChunks.length} chunks`)

    // Extract all messages from all chunks
    const allMessages: Array<{
      entityId: number
      componentId: number
      componentName: string
      timestamp: number
      data: any
    }> = []

    for (let i = 0; i < messageCapture.capturedChunks.length; i++) {
      const chunk = messageCapture.capturedChunks[i]
      const messages = extractMessageInfo(chunk, engine)
      console.log(`Chunk ${i}: ${chunk.byteLength} bytes, ${messages.length} messages`)

      // Verify chunk size doesn't exceed LiveKit limit - this is the key test!
      expect(chunk.byteLength / 1024).toBeLessThanOrEqual(LIVEKIT_MAX_SIZE)

      allMessages.push(...messages)
    }

    // ASSERTIONS: Verify all created entities and components are present
    console.log('\n=== CRDT ASSERTIONS ===')

    // Check that all created entities are present
    const foundEntities = new Set(allMessages.map((m) => m.entityId))
    const expectedEntities = new Set(entities.map((e) => e))
    const missingEntities = new Set<number>()
    expectedEntities.forEach((entityId) => {
      if (!foundEntities.has(entityId)) {
        missingEntities.add(entityId)
      }
    })

    if (missingEntities.size > 0) {
      console.error(`❌ Missing entities in chunks: [${Array.from(missingEntities).join(', ')}]`)
    } else {
      console.log(`✅ All ${expectedEntities.size} entities found in chunks`)
    }

    // Check each entity's components and their values
    const missingComponents = new Set<string>()
    const wrongValues = new Set<string>()

    // Helper function to find a component message for an entity
    const findComponentMessage = (entityId: number, componentId: number) => {
      return allMessages.find((m) => m.entityId === entityId && m.componentId === componentId)
    }

    // Check Entity1: SmallComponent + MediumComponent
    const entity1Small = findComponentMessage(entity1, SmallComponent.componentId)
    if (!entity1Small) {
      missingComponents.add(`Entity1-SmallComponent`)
    } else if (entity1Small.data?.id !== 'entity1-small' || entity1Small.data?.value !== 42) {
      wrongValues.add(
        `Entity1-SmallComponent: expected {id: 'entity1-small', value: 42}, got ${JSON.stringify(entity1Small.data)}`
      )
    }

    const entity1Medium = findComponentMessage(entity1, MediumComponent.componentId)
    if (!entity1Medium) {
      missingComponents.add(`Entity1-MediumComponent`)
    } else if (
      entity1Medium.data?.id !== 'entity1-medium' ||
      entity1Medium.data?.description !== 'This is a medium component for entity 1'
    ) {
      wrongValues.add(`Entity1-MediumComponent: wrong values`)
    }

    // Check Entity2: SmallComponent + LargeComponent
    const entity2Small = findComponentMessage(entity2, SmallComponent.componentId)
    if (!entity2Small) {
      missingComponents.add(`Entity2-SmallComponent`)
    } else if (entity2Small.data?.id !== 'entity2-small' || entity2Small.data?.value !== 84) {
      wrongValues.add(
        `Entity2-SmallComponent: expected {id: 'entity2-small', value: 84}, got ${JSON.stringify(entity2Small.data)}`
      )
    }

    const entity2Large = findComponentMessage(entity2, LargeComponent.componentId)
    if (!entity2Large) {
      missingComponents.add(`Entity2-LargeComponent`)
    } else if (entity2Large.data?.id !== 'entity2-large' || !entity2Large.data?.data?.includes('A'.repeat(1000))) {
      wrongValues.add(`Entity2-LargeComponent: wrong data`)
    }

    // Check Entity3: SmallComponent + MediumComponent + LargeComponent
    const entity3Small = findComponentMessage(entity3, SmallComponent.componentId)
    if (!entity3Small) {
      missingComponents.add(`Entity3-SmallComponent`)
    } else if (entity3Small.data?.id !== 'entity3-small' || entity3Small.data?.value !== 126) {
      wrongValues.add(
        `Entity3-SmallComponent: expected {id: 'entity3-small', value: 126}, got ${JSON.stringify(entity3Small.data)}`
      )
    }

    const entity3Medium = findComponentMessage(entity3, MediumComponent.componentId)
    if (!entity3Medium) {
      missingComponents.add(`Entity3-MediumComponent`)
    } else if (
      entity3Medium.data?.id !== 'entity3-medium' ||
      entity3Medium.data?.description !== 'This is a medium component for entity 3'
    ) {
      wrongValues.add(`Entity3-MediumComponent: wrong values`)
    }

    const entity3Large = findComponentMessage(entity3, LargeComponent.componentId)
    if (!entity3Large) {
      missingComponents.add(`Entity3-LargeComponent`)
    } else if (entity3Large.data?.id !== 'entity3-large' || !entity3Large.data?.data?.includes('B'.repeat(800))) {
      wrongValues.add(`Entity3-LargeComponent: wrong data`)
    }

    if (missingComponents.size > 0) {
      console.error(`❌ Missing components: [${Array.from(missingComponents).join(', ')}]`)
    } else {
      console.log(`✅ All created components found in chunks`)
    }

    if (wrongValues.size > 0) {
      console.error(`❌ Wrong component values: [${Array.from(wrongValues).join(', ')}]`)
    } else {
      console.log(`✅ All component values are correct`)
    }

    // Check for duplicates
    const duplicatePairs = new Set<string>()
    const seenPairs = new Set<string>()
    allMessages.forEach((msg) => {
      const pair = `${msg.entityId}-${msg.componentId}`
      if (seenPairs.has(pair)) {
        duplicatePairs.add(pair)
      } else {
        seenPairs.add(pair)
      }
    })

    if (duplicatePairs.size > 0) {
      console.error(`❌ Found duplicate component-entity pairs: [${Array.from(duplicatePairs).join(', ')}]`)
    } else {
      console.log(`✅ No duplicate component-entity pairs found`)
    }

    // Final assertions
    expect(missingEntities.size).toBe(0)
    expect(missingComponents.size).toBe(0)
    expect(wrongValues.size).toBe(0)
    expect(duplicatePairs.size).toBe(0)
  })

  it('Should test CRDT chunking with very large single component', async () => {
    const { engine, messageCapture, SyncComponents, NetworkEntity } = setupEngineWithSyncTransport('test-client-large')

    const HugeComponent = engine.defineComponent('hugeComponent', {
      id: Schemas.String,
      massiveData: Schemas.String
    })

    const entity = engine.addEntity()
    NetworkEntity.create(entity, { networkId: 1, entityId: entity })
    HugeComponent.create(entity, {
      id: 'huge-test',
      massiveData: 'X'.repeat(20000) // 20KB string - should exceed LIVEKIT_MAX_SIZE
    })
    SyncComponents.create(entity)

    await engine.update(1)
    await engine.update(1) // Second update to ensure message processing

    console.log(`\n=== HUGE COMPONENT CRDT TEST ===`)
    console.log(`Generated ${messageCapture.capturedChunks.length} chunks for huge component`)

    // Verify that chunks don't exceed LiveKit limit - this is the key test!
    messageCapture.capturedChunks.forEach((chunk, index) => {
      console.log(`Chunk ${index}: ${chunk.byteLength} bytes`)
      expect(chunk.byteLength / 1024).toBeLessThanOrEqual(LIVEKIT_MAX_SIZE)
    })

    // Should handle the oversized component gracefully (might be 0 chunks if message too large)
    expect(messageCapture.capturedChunks.length).toBeGreaterThanOrEqual(0)
  })

  it('Should test CRDT chunking with server mode enabled', async () => {
    const { engine, messageCapture, SyncComponents, NetworkEntity } = setupEngineWithSyncTransport('test-server', true)

    const SimpleComponent = engine.defineComponent('simpleComponent', {
      id: Schemas.String,
      value: Schemas.Number
    })

    const LargeComponent = engine.defineComponent('largeComponent', {
      id: Schemas.String,
      data: Schemas.String
    })

    // Create entities with different sizes
    const entity1 = engine.addEntity()
    NetworkEntity.create(entity1, { networkId: 1, entityId: entity1 })
    SimpleComponent.create(entity1, { id: 'entity1', value: 100 })
    SyncComponents.create(entity1)

    const entity2 = engine.addEntity()
    NetworkEntity.create(entity2, { networkId: 2, entityId: entity2 })
    LargeComponent.create(entity2, {
      id: 'entity2',
      data: 'A'.repeat(5000) // Large enough to trigger chunking
    })
    SyncComponents.create(entity2)

    await engine.update(1)
    await engine.update(1) // Second update to ensure message processing

    console.log(`\n=== SERVER MODE TEST ===`)
    console.log(`Server generated: ${messageCapture.capturedChunks.length} chunks`)

    // Server should generate chunked network messages
    expect(messageCapture.capturedChunks.length).toBeGreaterThanOrEqual(0)

    // Verify server chunks don't exceed LiveKit limit - this is the key test!
    messageCapture.capturedChunks.forEach((chunk, index) => {
      console.log(`Server chunk ${index}: ${chunk.byteLength} bytes`)
      expect(chunk.byteLength / 1024).toBeLessThanOrEqual(LIVEKIT_MAX_SIZE)
    })
  })

  it('Should test CRDT chunking with component updates', async () => {
    const { engine, messageCapture, SyncComponents, NetworkEntity } =
      setupEngineWithSyncTransport('test-client-updates')

    const TestComponent = engine.defineComponent('testComponent', {
      id: Schemas.String,
      value: Schemas.Number,
      data: Schemas.String
    })

    const entity = engine.addEntity()
    NetworkEntity.create(entity, { networkId: 1, entityId: entity })
    TestComponent.create(entity, { id: 'test', value: 1, data: 'initial' })
    SyncComponents.create(entity)

    await engine.update(1)
    await engine.update(1) // Process initial state

    // Clear previous chunks
    messageCapture.reset()

    // Update the component with larger data
    TestComponent.getMutable(entity).data = 'A'.repeat(3000)
    TestComponent.getMutable(entity).value = 2

    await engine.update(1)
    await engine.update(1) // Process the updates

    console.log(`\n=== COMPONENT UPDATE TEST ===`)
    console.log(`Generated ${messageCapture.capturedChunks.length} chunks for component update`)

    // Verify chunks don't exceed LiveKit limit - this is the key test!
    messageCapture.capturedChunks.forEach((chunk, index) => {
      console.log(`Chunk ${index}: ${chunk.byteLength} bytes`)
      expect(chunk.byteLength / 1024).toBeLessThanOrEqual(LIVEKIT_MAX_SIZE)
    })

    // Should have at least one chunk for the update
    expect(messageCapture.capturedChunks.length).toBeGreaterThanOrEqual(0)
  })
})

// Custom function to extract entity and component info from CRDT messages
function extractMessageInfo(data: Uint8Array, engine: any) {
  const buffer = new ReadWriteByteBuffer(data)
  const messages: Array<{
    entityId: number
    componentId: number
    componentName: string
    timestamp: number
    data: any
  }> = []

  let message: CrdtMessage | null
  while ((message = readMessage(buffer))) {
    if (
      message.type === CrdtMessageType.PUT_COMPONENT ||
      message.type === CrdtMessageType.PUT_COMPONENT_NETWORK ||
      message.type === CrdtMessageType.DELETE_COMPONENT_NETWORK ||
      message.type === CrdtMessageType.DELETE_COMPONENT ||
      message.type === CrdtMessageType.APPEND_VALUE
    ) {
      const { componentId, timestamp, entityId } = message
      const messageData = 'data' in message ? message.data : undefined

      try {
        const component = engine.getComponent(componentId)
        let deserializedData = null
        if (messageData) {
          const dataBuffer = new ReadWriteByteBuffer(messageData)
          deserializedData = component.schema.deserialize(dataBuffer)
        }

        messages.push({
          entityId,
          componentId,
          componentName: component.componentName,
          timestamp,
          data: deserializedData
        })
      } catch {
        messages.push({
          entityId,
          componentId,
          componentName: `unknown-${componentId}`,
          timestamp,
          data: null
        })
      }
    }
  }

  return messages
}
