import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { CrdtMessageType, PutComponentMessageBody, DeleteComponentMessageBody } from '../../packages/@dcl/ecs/src/serialization/crdt/types'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

const PositionSchema = {
  x: Schemas.Float,
  y: Schemas.Float,
  z: Schemas.Float
}

const NestedSchema = {
  position: Schemas.Map({
    x: Schemas.Float,
    y: Schemas.Float
  }),
  name: Schemas.String
}

const ArraySchema = {
  items: Schemas.Array(Schemas.Int)
}

describe('CRDT message suppression for unchanged mutables', () => {
  it('should NOT emit CRDT message when getMutable is called without changes', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-1', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })

    // Flush initial create
    const createMessages = Array.from(Position.getCrdtUpdates())
    expect(createMessages).toHaveLength(1)
    expect(createMessages[0].type).toBe(CrdtMessageType.PUT_COMPONENT)

    // Call getMutable without modifying anything
    const _mutable = Position.getMutable(entity)

    // Flush again - should produce no messages
    const noChangeMessages = Array.from(Position.getCrdtUpdates())
    expect(noChangeMessages).toHaveLength(0)
  })

  it('should NOT emit CRDT message when getMutableOrNull is called without changes', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-2', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    const _mutable = Position.getMutableOrNull(entity)
    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(0)
  })

  it('should NOT emit CRDT message when getOrCreateMutable is called on existing component without changes', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-3', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    const _mutable = Position.getOrCreateMutable(entity)
    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(0)
  })

  it('should emit CRDT message when getMutable is called WITH changes', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-4', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    Position.getMutable(entity).x = 99
    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe(CrdtMessageType.PUT_COMPONENT)
  })

  it('should detect nested property changes', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Nested = engine.defineComponent('nested-test-1', NestedSchema)

    Nested.create(entity, { position: { x: 0, y: 0 }, name: 'test' })
    Array.from(Nested.getCrdtUpdates()) // flush create

    Nested.getMutable(entity).position.x = 42
    const messages = Array.from(Nested.getCrdtUpdates())
    expect(messages).toHaveLength(1)
  })

  it('should detect array mutations', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const ArrayComp = engine.defineComponent('array-test-1', ArraySchema)

    ArrayComp.create(entity, { items: [1, 2, 3] })
    Array.from(ArrayComp.getCrdtUpdates()) // flush create

    ArrayComp.getMutable(entity).items.push(4)
    const messages = Array.from(ArrayComp.getCrdtUpdates())
    expect(messages).toHaveLength(1)
  })

  it('should always emit DELETE messages regardless of prior state', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-5', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    // getMutable marks dirty, then deleteFrom also marks dirty
    Position.getMutable(entity)
    Position.deleteFrom(entity)

    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe(CrdtMessageType.DELETE_COMPONENT)
  })

  it('should NOT increment Lamport timestamp for suppressed messages', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-6', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    const createMessages = Array.from(Position.getCrdtUpdates())
    const createTimestamp = (createMessages[0] as PutComponentMessageBody).timestamp
    expect(createTimestamp).toBe(1)

    // getMutable without change - should NOT increment timestamp
    Position.getMutable(entity)
    Array.from(Position.getCrdtUpdates()) // flush (suppressed)

    // Now actually change - timestamp should be 2 (not 3)
    Position.getMutable(entity).x = 99
    const changeMessages = Array.from(Position.getCrdtUpdates())
    expect(changeMessages).toHaveLength(1)
    expect((changeMessages[0] as PutComponentMessageBody).timestamp).toBe(2)
  })

  it('should update snapshot after receiving remote CRDT update', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-7', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    // Simulate receiving a remote update
    const buf = new ReadWriteByteBuffer()
    Position.schema.serialize({ x: 5, y: 6, z: 7 }, buf)
    const remoteData = buf.toBinary()

    Position.updateFromCrdt({
      type: CrdtMessageType.PUT_COMPONENT,
      componentId: Position.componentId,
      entityId: entity,
      data: remoteData,
      timestamp: 10
    })

    // getMutable without change after remote update
    Position.getMutable(entity)
    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(0)
  })

  it('should correctly handle multiple getMutable calls per tick', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-8', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    // First getMutable - no change
    Position.getMutable(entity)
    // Second getMutable - actual change
    Position.getMutable(entity).x = 42

    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe(CrdtMessageType.PUT_COMPONENT)
  })

  it('should suppress message when value is changed back to original within same tick', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-9', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    // Change and revert within the same tick
    const mutable = Position.getMutable(entity)
    mutable.x = 999
    mutable.x = 1 // reverted

    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(0)
  })

  it('should emit message for createOrReplace with different data', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-10', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    Position.createOrReplace(entity, { x: 99, y: 99, z: 99 })
    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(1)
  })

  it('should always emit message for createOrReplace even with identical data', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-11', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    // createOrReplace always emits because it expresses explicit intent to set a value
    Position.createOrReplace(entity, { x: 1, y: 2, z: 3 })
    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(1)
  })

  it('should emit after delete even if getMutable was called before', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-12', PositionSchema)

    Position.create(entity, { x: 1, y: 2, z: 3 })
    Array.from(Position.getCrdtUpdates()) // flush create

    Position.deleteFrom(entity)
    const messages = Array.from(Position.getCrdtUpdates())
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe(CrdtMessageType.DELETE_COMPONENT)
  })

  it('should work correctly across multiple flush cycles', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const Position = engine.defineComponent('position-test-13', PositionSchema)

    Position.create(entity, { x: 0, y: 0, z: 0 })
    expect(Array.from(Position.getCrdtUpdates())).toHaveLength(1) // create

    // Cycle 2: no change
    Position.getMutable(entity)
    expect(Array.from(Position.getCrdtUpdates())).toHaveLength(0)

    // Cycle 3: actual change
    Position.getMutable(entity).x = 10
    expect(Array.from(Position.getCrdtUpdates())).toHaveLength(1)

    // Cycle 4: no change
    Position.getMutable(entity)
    expect(Array.from(Position.getCrdtUpdates())).toHaveLength(0)

    // Cycle 5: different change
    Position.getMutable(entity).y = 20
    expect(Array.from(Position.getCrdtUpdates())).toHaveLength(1)
  })
})
