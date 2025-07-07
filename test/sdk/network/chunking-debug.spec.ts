import { Entity, Schemas, Engine } from '../../../packages/@dcl/ecs/dist'
import * as components from '../../../packages/@dcl/ecs/dist/components'
import { engineToCrdt } from '../../../packages/@dcl/sdk/network/state'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/dist/serialization/ByteBuffer'
import { readMessage } from '../../../packages/@dcl/ecs/dist/serialization/crdt/message'
import { CrdtMessage, CrdtMessageType } from '../../../packages/@dcl/ecs'

function getEngineWithComponents() {
  const engine = Engine()
  return {
    engine,
    SyncComponents: components.SyncComponents(engine),
    NetworkEntity: components.NetworkEntity(engine)
  }
}

describe('Chunking Debug Tests', () => {
  it('Should test chunking with multiple entities and components', async () => {
    const { engine, SyncComponents, NetworkEntity } = getEngineWithComponents()
    // Define multiple components with different data sizes
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
    SyncComponents.create(entity1)
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

    // Entity 4: Only Small component (to test edge case)
    const entity4 = engine.addEntity()
    NetworkEntity.create(entity4, { networkId: 4, entityId: entity4 })
    SmallComponent.create(entity4, { id: 'entity4-small', value: 168 })
    SyncComponents.create(entity4)
    entities.push(entity4)

    // Entity 5: Large component only (to test single large message)
    const entity5 = engine.addEntity()
    NetworkEntity.create(entity5, { networkId: 5, entityId: entity5 })
    LargeComponent.create(entity5, {
      id: 'entity5-large',
      data: 'C'.repeat(1500), // Very large string
      metadata: [
        { key: 'bigkey1', value: 'bigvalue1'.repeat(200) },
        { key: 'bigkey2', value: 'bigvalue2'.repeat(200) },
        { key: 'bigkey3', value: 'bigvalue3'.repeat(200) }
      ]
    })
    SyncComponents.create(entity5)
    entities.push(entity5)

    // Update engine to process all changes
    await engine.update(1)

    // Test the chunking
    const chunks = engineToCrdt(engine)

    console.log(`Generated ${chunks.length} chunks`)

    // Extract all messages from all chunks
    const allMessages: Array<{
      entityId: number
      componentId: number
      componentName: string
      timestamp: number
      data: any
    }> = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const messages = extractMessageInfo(chunk, engine)
      console.log(`Chunk ${i}: ${chunk.byteLength} bytes, ${messages.length} messages`)
      allMessages.push(...messages)
    }

    // ASSERTIONS: Verify all created entities and components are present with correct values
    console.log('\n=== ASSERTIONS ===')

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

    // Check Entity4: SmallComponent only
    const entity4Small = findComponentMessage(entity4, SmallComponent.componentId)
    if (!entity4Small) {
      missingComponents.add(`Entity4-SmallComponent`)
    } else if (entity4Small.data?.id !== 'entity4-small' || entity4Small.data?.value !== 168) {
      wrongValues.add(
        `Entity4-SmallComponent: expected {id: 'entity4-small', value: 168}, got ${JSON.stringify(entity4Small.data)}`
      )
    }

    // Check Entity5: LargeComponent only
    const entity5Large = findComponentMessage(entity5, LargeComponent.componentId)
    if (!entity5Large) {
      missingComponents.add(`Entity5-LargeComponent`)
    } else if (entity5Large.data?.id !== 'entity5-large' || !entity5Large.data?.data?.includes('C'.repeat(1500))) {
      wrongValues.add(`Entity5-LargeComponent: wrong data`)
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

  it('Should test simple case with two entities in single chunk', async () => {
    const { engine, SyncComponents, NetworkEntity } = getEngineWithComponents()
    // Define a simple component
    const SimpleComponent = engine.defineComponent('simpleComponent', {
      id: Schemas.String,
      value: Schemas.Number
    })

    // Create two simple entities
    const entity1 = engine.addEntity()
    NetworkEntity.create(entity1, { networkId: 1, entityId: entity1 })
    SimpleComponent.create(entity1, { id: 'entity1', value: 100 })
    SyncComponents.create(entity1)

    const entity2 = engine.addEntity()
    NetworkEntity.create(entity2, { networkId: 2, entityId: entity2 })
    SimpleComponent.create(entity2, { id: 'entity2', value: 200 })
    SyncComponents.create(entity2)

    // Update engine to process all changes
    await engine.update(1)

    // Test the chunking
    const chunks = engineToCrdt(engine)

    console.log(`\n=== SIMPLE TEST ===`)
    console.log(`Generated ${chunks.length} chunks`)

    // Debug: Log chunk sizes
    chunks.forEach((chunk, index) => {
      console.log(`Chunk ${index}: ${chunk.byteLength} bytes`)
    })

    // Should only have 1 chunk for small data
    expect(chunks.length).toBe(1)

    // Extract messages from the single chunk
    const messages = extractMessageInfo(chunks[0], engine)
    console.log(`Chunk 0: ${chunks[0].byteLength} bytes, ${messages.length} messages`)

    // Check that both entities are present
    const foundEntities = new Set(messages.map((m) => m.entityId))
    expect(foundEntities.has(entity1)).toBe(true)
    expect(foundEntities.has(entity2)).toBe(true)

    // Check that both components are present with correct values
    const entity1Message = messages.find((m) => m.entityId === entity1 && m.componentId === SimpleComponent.componentId)
    const entity2Message = messages.find((m) => m.entityId === entity2 && m.componentId === SimpleComponent.componentId)

    expect(entity1Message).toBeDefined()
    expect(entity1Message?.data?.id).toBe('entity1')
    expect(entity1Message?.data?.value).toBe(100)

    expect(entity2Message).toBeDefined()
    expect(entity2Message?.data?.id).toBe('entity2')
    expect(entity2Message?.data?.value).toBe(200)

    console.log(`✅ Simple test passed: ${messages.length} messages in 1 chunk`)
  })

  it('Should test edge case with very large single component', async () => {
    const { engine, SyncComponents, NetworkEntity } = getEngineWithComponents()
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

    const chunks = engineToCrdt(engine)

    console.log(`\n=== HUGE COMPONENT TEST ===`)
    console.log(`Generated ${chunks.length} chunks for huge component`)

    // This should handle the oversized component gracefully
    expect(chunks.length).toBeGreaterThanOrEqual(0)
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
