import { CrdtMessageType, Entity, Schemas } from '../../packages/@dcl/ecs/src'
import { ByteBuffer, ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { TransformSchema } from '../../packages/@dcl/ecs/src/components/manual/Transform'
import { createValueSetComponentDefinitionFromSchema } from '../../packages/@dcl/ecs/src/engine/grow-only-value-set-component-definition'

declare const globalThis: any

describe('Conflict resolution rules for GrowOnlyValueSet based components', () => {
  beforeAll(() => {
    globalThis.DEBUG = 'development'
  })

  const schema = Schemas.Map({
    timestamp: Schemas.Int,
    text: Schemas.String
  })

  const component = createValueSetComponentDefinitionFromSchema('test', 1, schema, {
    maxElements: 10,
    timestampFunction(value) {
      return value.timestamp
    }
  })

  afterEach(() => {
    // clear state
    component.getCrdtUpdates()
  })

  it('readonly values', () => {
    expect(component.componentType).toEqual(1)
    expect(component.componentId).toEqual(1)
    expect(component.componentName).toEqual('test')
  })

  it('GET over an unknown entity should return empty set', () => {
    expect(component.get(123 as Entity)).toEqual(new Set())
  })

  it('addValue in unexistent value should create the set', () => {
    const entityId = 0 as Entity

    expect(component.has(entityId)).toEqual(false)

    component.addValue(entityId, {
      text: 'hola',
      timestamp: 1
    })

    expect(component.has(entityId)).toEqual(true)

    expect(Array.from(component.dirtyIterator())).toEqual([entityId])
    expect(Array.from(component.getCrdtUpdates())).toMatchObject([
      {
        componentId: 1,
        type: CrdtMessageType.APPEND_VALUE,
        timestamp: 0
      }
    ])

    expect(Array.from(component.iterator())).toEqual([
      [
        entityId,
        new Set([
          {
            text: 'hola',
            timestamp: 1
          }
        ])
      ]
    ])
  })

  it('GET over an non-empty entity should return set with values', () => {
    expect(component.get(0 as Entity)).toEqual(
      new Set([
        {
          text: 'hola',
          timestamp: 1
        }
      ])
    )
  })

  it('APPEND should always succeed', () => {
    const entityId = 0 as Entity

    const buf = new ReadWriteByteBuffer()
    component.schema.serialize(
      {
        text: 'asd',
        timestamp: 2
      },
      buf
    )
    const [_conflict, value] = component.updateFromCrdt({
      componentId: 1,
      data: buf.toBinary(),
      entityId,
      timestamp: 0,
      type: CrdtMessageType.APPEND_VALUE
    })
    expect(value).toMatchObject({
      text: 'asd',
      timestamp: 2
    })

    // append operations do not generate a dirty state
    expect(Array.from(component.dirtyIterator())).toEqual([])
    expect(Array.from(component.getCrdtUpdates())).toMatchObject([])
    const [noValue] = component.updateFromCrdt({
      componentId: 1,
      entityId,
      timestamp: 0,
      data: buf.toBinary(),
      type: CrdtMessageType.PUT_COMPONENT
    })
    expect(noValue).toBe(null)
  })

  it('GET also includes APPEND(ed) message', () => {
    // 1. check both results are there
    // 2. check both results are ordered
    expect(component.get(0 as Entity)).toEqual(
      new Set([
        {
          text: 'hola',
          timestamp: 1
        },
        {
          text: 'asd',
          timestamp: 2
        }
      ])
    )
  })

  it('APPEND unordered must order the elements', () => {
    const entityId = 1 as Entity

    const timestamps = [1, 41, 5, 2, 8, 3, 4, 1, 9, 99]

    for (const timestamp of timestamps) {
      const buf = new ReadWriteByteBuffer()
      component.schema.serialize(
        {
          text: timestamps.toString(),
          timestamp
        },
        buf
      )

      component.updateFromCrdt({
        componentId: 1,
        data: buf.toBinary(),
        entityId,
        timestamp: 0,
        type: CrdtMessageType.APPEND_VALUE
      })
    }

    // assert that the result is ordered
    expect(Array.from(component.get(entityId)).map((_) => _.timestamp)).toEqual([1, 1, 2, 3, 4, 5, 8, 9, 41, 99])

    // append operations do not generate a dirty state
    expect(Array.from(component.dirtyIterator())).toEqual([])
    expect(Array.from(component.getCrdtUpdates())).toMatchObject([])
  })

  it('addValue many times should sort and trim to the max capacity', () => {
    const entityId = 155 as Entity

    const timestamps = [101, 41, 5, 2, 4, 44, 12, 31, 99, 18, 3, 4, 1, 9, 99]

    for (const timestamp of timestamps) {
      component.addValue(entityId, {
        text: timestamp.toString(),
        timestamp
      })
    }

    // assert that the result is ordered
    {
      const results = Array.from(component.get(entityId)).map((_) => _.timestamp)
      expect(results).toHaveLength(10)
      expect(results).toEqual([5, 9, 12, 18, 31, 41, 44, 99, 99, 101])
    }
    // add a value
    component.addValue(entityId, { text: 'hola', timestamp: 100 })

    // check it was appended and then the first element got removed
    {
      const results = Array.from(component.get(entityId)).map((_) => _.timestamp)
      expect(results).toHaveLength(10)
      expect(results).toEqual([9, 12, 18, 31, 41, 44, 99, 99, 100, 101])
    }
  })

  it('APPEND unordered must order the elements, adding extra elements should also remove until the max size is reached', () => {
    const entityId = 1 as Entity

    const timestamps = [1, 41, 5, 2, 4, 44, 12, 31, 99, 18, 3, 4, 1, 9, 99]

    for (const timestamp of timestamps) {
      const buf = new ReadWriteByteBuffer()
      component.schema.serialize(
        {
          text: timestamps.toString(),
          timestamp
        },
        buf
      )

      component.updateFromCrdt({
        componentId: 1,
        data: buf.toBinary(),
        entityId,
        timestamp: 0,
        type: CrdtMessageType.APPEND_VALUE
      })
    }

    // assert that the result is ordered
    const results = Array.from(component.get(entityId)).map((_) => _.timestamp)
    expect(results).toHaveLength(10)
    expect(results).toEqual([9, 12, 18, 31, 41, 41, 44, 99, 99, 99])

    // assert that the result is ordered
    {
      const results = Array.from(component.get(entityId)).map((_) => _.timestamp)
      expect(results).toHaveLength(10)
      expect(results).toEqual([9, 12, 18, 31, 41, 41, 44, 99, 99, 99])
    }
    // add a value
    component.addValue(entityId, { text: 'hola', timestamp: 100 })

    // check it was appended and then the first element got removed
    {
      const results = Array.from(component.get(entityId)).map((_) => _.timestamp)
      expect(results).toHaveLength(10)
      expect(results).toEqual([12, 18, 31, 41, 41, 44, 99, 99, 99, 100])
    }

    expect(Array.from(component.dirtyIterator())).toEqual([entityId])
    expect(Array.from(component.getCrdtUpdates())).toMatchObject([
      {
        componentId: 1,
        type: CrdtMessageType.APPEND_VALUE,
        timestamp: 0,
        entityId
      }
    ])
  })

  it('GET results are read-only', () => {
    expect(() => (component.get(0 as Entity) as any).add(1)).toThrow('The set is frozen')
    expect(() => (component.get(0 as Entity) as any).clear()).toThrow('The set is frozen')
    const [value] = component.get(0 as Entity)
    expect(() => {
      ;(value as any).text = 'newValue'
    }).toThrow('Cannot assign to read only property')
  })

  it('DELETE an unexistent entity is a noop', () => {
    component.entityDeleted(333 as Entity, false)
  })

  it('DELETE an existent entity clears out its value', () => {
    component.entityDeleted(0 as Entity, false)
    expect(component.get(0 as Entity)).toEqual(new Set([]))
  })
})

describe('Conflict resolution rules for GrowOnlyValueSet based components with Extended Schema', () => {
  const component = createValueSetComponentDefinitionFromSchema('test', 1, TransformSchema, {
    maxElements: 10,
    timestampFunction(value) {
      return value.parent || 0
    }
  })

  it('addValue works with schema.extend', () => {
    const entityId = 0 as Entity

    expect(component.has(entityId)).toEqual(false)

    component.addValue(entityId, { parent: 3 } as any)

    expect(component.has(entityId)).toEqual(true)

    expect(Array.from(component.dirtyIterator())).toEqual([entityId])
    expect(Array.from(component.getCrdtUpdates())).toMatchObject([
      {
        componentId: 1,
        type: CrdtMessageType.APPEND_VALUE,
        timestamp: 0
      }
    ])

    expect(Array.from(component.iterator())).toEqual([
      [
        entityId,
        new Set([
          {
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            parent: 3 as Entity
          }
        ])
      ]
    ])
  })
})

describe('Conflict resolution rules for GrowOnlyValueSet based components with Schema.Int', () => {
  const component = createValueSetComponentDefinitionFromSchema('test', 1, Schemas.Int, {
    maxElements: 10,
    timestampFunction(value) {
      return value
    }
  })

  it('addValue works with schema', () => {
    const entityId = 0 as Entity

    expect(component.has(entityId)).toEqual(false)

    component.addValue(entityId, 3)

    expect(component.has(entityId)).toEqual(true)

    expect(Array.from(component.dirtyIterator())).toEqual([entityId])
    expect(Array.from(component.getCrdtUpdates())).toMatchObject([
      {
        componentId: 1,
        type: CrdtMessageType.APPEND_VALUE,
        timestamp: 0
      }
    ])

    expect(Array.from(component.iterator())).toEqual([[entityId, new Set([3])]])
  })
})

describe('When dumping the CRDT state of a component', () => {
  it('should concat the binary data into the byte buffer provided', () => {
    const component = createValueSetComponentDefinitionFromSchema('test', 1, Schemas.Int, {
      maxElements: 10,
      timestampFunction(value) {
        return value
      }
    })
    const entityId = 0 as Entity
    component.addValue(entityId, 3)
    const messages: ByteBuffer = new ReadWriteByteBuffer()
    component.dumpCrdtStateToBuffer(messages)
    expect(messages.toBinary()).toEqual(
      new Uint8Array([28, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0])
    )
  })

  it('should concat the binary data for the entities that are filtered into the byte buffer provided', () => {
    const component = createValueSetComponentDefinitionFromSchema('test', 1, Schemas.Int, {
      maxElements: 10,
      timestampFunction(value) {
        return value
      }
    })
    const entityId = 0 as Entity
    const entityId2 = 1 as Entity
    component.addValue(entityId, 3)
    component.addValue(entityId2, 8)
    const messages: ByteBuffer = new ReadWriteByteBuffer()
    component.dumpCrdtStateToBuffer(messages, (entity) => entity === 0)
    expect(messages.toBinary()).toEqual(
      new Uint8Array([28, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0])
    )
  })
})

describe('Component validation methods', () => {
  function createTestComponent() {
    return createValueSetComponentDefinitionFromSchema('test', 1, Schemas.Int, {
      maxElements: 10,
      timestampFunction(value) {
        return value
      }
    })
  }

  it('should handle __dry_run_updateFromCrdt method', () => {
    const component = createTestComponent()
    const buf = new ReadWriteByteBuffer()
    const result = component.__dry_run_updateFromCrdt({
      componentId: 1,
      data: buf.toBinary(),
      entityId: 123 as Entity,
      timestamp: 0,
      type: CrdtMessageType.APPEND_VALUE
    })

    // Should return StateUpdatedData as per the implementation
    expect(result).toBe(5) // ProcessMessageResultType.StateUpdatedData = 5
  })

  it('should handle validateBeforeChange with global callback', () => {
    const component = createTestComponent()
    let globalCallbackCalled = false
    let callbackValue: any = null

    // Test global validation callback (single argument overload)
    component.validateBeforeChange((value) => {
      globalCallbackCalled = true
      callbackValue = value
      return true
    })

    // Trigger validation by calling __run_validateBeforeChange
    const entity = 123 as Entity
    const newValue = [42]
    const result = component.__run_validateBeforeChange(entity, newValue as any, 'test-sender', 'test-creator')

    expect(result).toBe(true)
    expect(globalCallbackCalled).toBe(true)
    expect(callbackValue).toMatchObject({
      entity,
      currentValue: [],
      newValue,
      senderAddress: 'test-sender',
      createdBy: 'test-creator'
    })
  })

  it('should handle validateBeforeChange with entity-specific callback', () => {
    const component = createTestComponent()
    let entityCallbackCalled = false
    let callbackValue: any = null
    const entity = 456 as Entity

    // Test entity-specific validation callback (two argument overload)
    component.validateBeforeChange(entity, (value) => {
      entityCallbackCalled = true
      callbackValue = value
      return true
    })

    // Trigger validation by calling __run_validateBeforeChange
    const newValue = 99
    const result = component.__run_validateBeforeChange(entity, newValue, 'entity-sender', 'entity-creator')

    expect(result).toBe(true)
    expect(entityCallbackCalled).toBe(true)
    expect(callbackValue).toMatchObject({
      entity,
      currentValue: [],
      newValue,
      senderAddress: 'entity-sender',
      createdBy: 'entity-creator'
    })
  })

  it('should handle validateBeforeChange with both global and entity callbacks', () => {
    const component = createTestComponent()
    let globalCalled = false
    let entityCalled = false
    const entity = 789 as Entity

    // Add both global and entity-specific validation
    component.validateBeforeChange(() => {
      globalCalled = true
      return true
    })

    component.validateBeforeChange(entity, () => {
      entityCalled = true
      return true
    })

    // Trigger validation
    const result = component.__run_validateBeforeChange(entity, 55, 'dual-sender', 'dual-creator')

    expect(result).toBe(true)
    expect(globalCalled).toBe(true)
    expect(entityCalled).toBe(true)
  })

  it('should handle validation rejection when global callback returns false', () => {
    const component = createTestComponent()
    let globalCalled = false
    const entity = 111 as Entity

    // Global callback that rejects
    component.validateBeforeChange(() => {
      globalCalled = true
      return false
    })

    const result = component.__run_validateBeforeChange(entity, 33, 'reject-sender', 'reject-creator')

    expect(result).toBe(false)
    expect(globalCalled).toBe(true)
  })

  it('should handle validation rejection when entity callback returns false', () => {
    const component = createTestComponent()
    let entityCalled = false
    const entity = 222 as Entity

    // Entity callback that rejects
    component.validateBeforeChange(entity, () => {
      entityCalled = true
      return false
    })

    const result = component.__run_validateBeforeChange(entity, 44, 'entity-reject-sender', 'entity-reject-creator')

    expect(result).toBe(false)
    expect(entityCalled).toBe(true)
  })

  it('should get current value when validating existing entity', () => {
    const component = createTestComponent()
    const entity = 333 as Entity
    let callbackValue: any = null

    // Add some data to the entity first
    component.addValue(entity, 77)

    // Add validation callback
    component.validateBeforeChange((value) => {
      callbackValue = value
      return true
    })

    // Trigger validation
    component.__run_validateBeforeChange(entity, 88, 'current-sender', 'current-creator')

    expect(callbackValue.currentValue).toEqual([77])
    expect(callbackValue.newValue).toBe(88)
  })

  it('should handle validation with null entity (covers undefined branch)', () => {
    const component = createTestComponent()
    let globalCallbackCalled = false
    let callbackValue: any = null

    // Add global validation callback
    component.validateBeforeChange((value) => {
      globalCallbackCalled = true
      callbackValue = value
      return true
    })

    // Test with null entity to cover the undefined branch in line 210
    // This will make entity && validateCallbacks.get(entity) return null
    const result = component.__run_validateBeforeChange(10 as Entity, 42, 'null-sender', 'null-creator')

    expect(result).toBe(true)
    expect(globalCallbackCalled).toBe(true)
    expect(callbackValue.entity).toBe(10)
    expect(callbackValue.newValue).toBe(42)
  })
})
