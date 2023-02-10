import { CrdtMessageType, Entity } from '../../packages/@dcl/ecs/src'
import { createUpdateFromCrdt } from '../../packages/@dcl/ecs/src/engine/component'
import { ByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

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

  const updateFn = createUpdateFromCrdt(componentId, timestamps, schema, data)

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
})
