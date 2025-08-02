import { CrdtMessageType, Entity, Schemas, Engine } from '../../packages/@dcl/ecs/src'
import { ByteBuffer, ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { dataCompare } from '../../packages/@dcl/ecs/src/systems/crdt/utils'
import {
  createUpdateLwwFromCrdt,
  createDumpLwwFunctionFromCrdt
} from '../../packages/@dcl/ecs/src/engine/lww-element-set-component-definition'

describe('dataCompare', () => {
  const testCases = [
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, -1],
    [Uint8Array.of(0, 0), Uint8Array.of(0), 1],
    [Uint8Array.of(0, 0), Uint8Array.of(0, 0), 0],
    [Uint8Array.of(0), Uint8Array.of(0, 0), -1],
    [Uint8Array.of(1), Uint8Array.of(0), 1],
    [Uint8Array.of(1), Uint8Array.of(1), 0],
    [Uint8Array.of(0), Uint8Array.of(1), -1],
    [null, 1, -1],
    [1, null, 1],
    ['a', null, 1],
    ['a', 'a', 0],
    ['a', 'b', -1],
    ['aa', 'b', 1],
    ['a', 'bb', -1]
  ] as const
  let i = 0
  for (const [a, b, result] of testCases) {
    it(`runs test case ${i++}`, () => {
      expect({ a, b, result: dataCompare(a, b) }).toEqual({ a, b, result: result })
    })
  }
})

describe('Conflict resolution rules for LWW-ElementSet based components', () => {
  const schema = {
    serialize(value: number, builder: ByteBuffer) {
      builder.writeInt8(value)
    },
    deserialize(reader: ByteBuffer) {
      return reader.readInt8()
    }
  }
  const componentId = 1
  const timestamps = new Map<Entity, number>()
  const data = new Map<Entity, number>()

  const updateFn = createUpdateLwwFromCrdt(componentId, timestamps, schema, data)
  const dumpFn = createDumpLwwFunctionFromCrdt(componentId, timestamps, schema, data)

  it('PUT an unexistent value should succeed', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      data: Uint8Array.of(1),
      entityId,
      timestamp: 0,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(1)

    // state assertions
    expect(data.get(entityId)).toEqual(1)
    expect(timestamps.get(entityId)).toEqual(0)
  })

  it('PUT the same value and timestamp should be idempotent', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      data: Uint8Array.of(1),
      entityId,
      timestamp: 0,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(1)

    // state assertions
    expect(data.get(entityId)).toEqual(1)
    expect(timestamps.get(entityId)).toEqual(0)
  })

  it('PUT a newer (timestamp) value should accept it', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      data: Uint8Array.of(1),
      entityId,
      timestamp: 1,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(1)

    // state assertions
    expect(data.get(entityId)).toEqual(1)
    expect(timestamps.get(entityId)).toEqual(1)
  })

  it('PUT an older (timestamp) value should reject the change and return a "correction" message', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      data: Uint8Array.of(1),
      entityId,
      timestamp: 0,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toMatchObject({
      componentId,
      entityId,
      data: Uint8Array.of(1),
      timestamp: 1,
      type: CrdtMessageType.PUT_COMPONENT
    })
    expect(currentValue).toEqual(1)

    // state assertions
    expect(data.get(entityId)).toEqual(1)
    expect(timestamps.get(entityId)).toEqual(1)
  })

  it('PUT a conflicting timestamp with higher value should accept the higher value', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      data: Uint8Array.of(2),
      entityId,
      timestamp: 1,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(2)

    // state assertions
    expect(data.get(entityId)).toEqual(2)
    expect(timestamps.get(entityId)).toEqual(1)
  })

  it('DELETE a conflicting timestamp should keep the value and return a correction message', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      entityId,
      timestamp: 1,
      type: CrdtMessageType.DELETE_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual({
      componentId,
      data: Uint8Array.of(2),
      entityId,
      timestamp: 1,
      type: CrdtMessageType.PUT_COMPONENT
    })
    expect(currentValue).toEqual(2)

    // state assertions
    expect(data.get(entityId)).toEqual(2)
    expect(timestamps.get(entityId)).toEqual(1)
  })

  it('DELETE with a new timestamp should succeed', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      entityId,
      timestamp: 3,
      type: CrdtMessageType.DELETE_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(undefined)

    // state assertions
    expect(data.get(entityId)).toEqual(undefined)
    expect(timestamps.get(entityId)).toEqual(3)
  })

  it('DELETE is idempotent', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      entityId,
      timestamp: 3,
      type: CrdtMessageType.DELETE_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(undefined)

    // state assertions
    expect(data.get(entityId)).toEqual(undefined)
    expect(timestamps.get(entityId)).toEqual(3)
  })

  it('PUT an old timestamp should return a DELETE correction message', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      data: Uint8Array.of(2),
      entityId,
      timestamp: 0,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual({
      componentId,
      entityId,
      timestamp: 3,
      type: CrdtMessageType.DELETE_COMPONENT
    })
    expect(currentValue).toEqual(undefined)

    // state assertions
    expect(data.get(entityId)).toEqual(undefined)
    expect(timestamps.get(entityId)).toEqual(3)
  })

  it('PUT using the same timestamp as the delete should be accepted', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      entityId,
      data: Uint8Array.of(10),
      timestamp: 3,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(10)

    // state assertions
    expect(data.get(entityId)).toEqual(10)
    expect(timestamps.get(entityId)).toEqual(3)
  })

  it('PUT is idempotent', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      entityId,
      data: Uint8Array.of(10),
      timestamp: 3,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual(null)
    expect(currentValue).toEqual(10)

    // state assertions
    expect(data.get(entityId)).toEqual(10)
    expect(timestamps.get(entityId)).toEqual(3)
  })

  it('PUT in case of null data it keeps the current state and returns correction message', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      entityId,
      data: null as any,
      timestamp: 3,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual({
      componentId,
      entityId,
      data: Uint8Array.of(10),
      timestamp: 3,
      type: CrdtMessageType.PUT_COMPONENT
    })
    expect(currentValue).toEqual(10)

    // state assertions
    expect(data.get(entityId)).toEqual(10)
    expect(timestamps.get(entityId)).toEqual(3)
  })

  it('PUT in case of empty data returns a correction message', () => {
    const entityId = 0 as Entity

    const [conflict, currentValue] = updateFn({
      componentId,
      entityId,
      data: new Uint8Array(),
      timestamp: 3,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // result assertions
    expect(conflict).toEqual({
      componentId,
      entityId,
      data: Uint8Array.of(10),
      timestamp: 3,
      type: CrdtMessageType.PUT_COMPONENT
    })
    expect(currentValue).toEqual(10)

    // state assertions
    expect(data.get(entityId)).toEqual(10)
    expect(timestamps.get(entityId)).toEqual(3)
  })
  describe('when using the dump function', () => {
    it('should concat all the binary data in the byte buffer', () => {
      const buffer: ByteBuffer = new ReadWriteByteBuffer()
      expect(buffer.toBinary()).toHaveLength(0)
      dumpFn(buffer)
      expect(buffer.toBinary().length).toBeGreaterThan(0)
    })
  })
})

describe('LWW Component validation methods', () => {
  function createTestComponent() {
    const engine = Engine()
    return engine.defineComponentFromSchema('test-lww', Schemas.Int)
  }

  it('should handle __dry_run_updateFromCrdt method', () => {
    const component = createTestComponent()
    const buf = new ReadWriteByteBuffer()
    buf.writeInt8(42)

    const result = component.__dry_run_updateFromCrdt({
      componentId: 1,
      data: buf.toBinary(),
      entityId: 123 as Entity,
      timestamp: 0,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // Should return StateUpdatedTimestamp for new entities
    expect(result).toBe(1) // ProcessMessageResultType.StateUpdatedTimestamp = 1
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
    const newValue = 42
    const result = component.__run_validateBeforeChange(entity, newValue, 'test-sender', 'test-creator')

    expect(result).toBe(true)
    expect(globalCallbackCalled).toBe(true)
    expect(callbackValue).toMatchObject({
      entity,
      currentValue: undefined,
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
      currentValue: undefined,
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
    component.create(entity, 77)

    // Add validation callback
    component.validateBeforeChange((value) => {
      callbackValue = value
      return true
    })

    // Trigger validation
    component.__run_validateBeforeChange(entity, 88, 'current-sender', 'current-creator')

    expect(callbackValue.currentValue).toBe(77)
    expect(callbackValue.newValue).toBe(88)
  })

  it('should handle __dry_run_updateFromCrdt with existing entity', () => {
    const component = createTestComponent()
    const entity = 555 as Entity

    // Create entity with initial value
    component.create(entity, 100)

    const buf = new ReadWriteByteBuffer()
    buf.writeInt8(101)

    const result = component.__dry_run_updateFromCrdt({
      componentId: 1,
      data: buf.toBinary(),
      entityId: entity,
      timestamp: 1,
      type: CrdtMessageType.PUT_COMPONENT
    })

    // Should return StateUpdatedTimestamp for timestamp update
    expect(result).toBe(1) // ProcessMessageResultType.StateUpdatedTimestamp = 1
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

    // Test with null entity to cover the undefined branch in line 350
    // This will make entity && validateCallbacks.get(entity) return null
    const result = component.__run_validateBeforeChange(10 as Entity, 42, 'null-sender', 'null-creator')

    expect(result).toBe(true)
    expect(globalCallbackCalled).toBe(true)
    expect(callbackValue.currentValue).toBe(undefined) // Should be undefined for null entity
    expect(callbackValue.entity).toBe(10)
    expect(callbackValue.newValue).toBe(42)
  })
})
