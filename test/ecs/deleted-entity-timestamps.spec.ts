import * as components from '../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { readMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/message'
import { CrdtMessage, CrdtMessageType } from '../../packages/@dcl/ecs/src/serialization/crdt/types'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

const CHURN_CYCLES = 5

function dumpOf(component: { dumpCrdtStateToBuffer: (buffer: ReadWriteByteBuffer) => void }): CrdtMessage[] {
  const buffer = new ReadWriteByteBuffer()
  component.dumpCrdtStateToBuffer(buffer)

  const messages: CrdtMessage[] = []
  let message: CrdtMessage | null
  while ((message = readMessage(buffer))) {
    messages.push(message)
  }
  return messages
}

describe('when entities that carried a component are removed', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let sentMessages: CrdtMessage[]

  beforeEach(async () => {
    engine = Engine()
    Transform = components.Transform(engine)
    sentMessages = []

    const transport: Transport = {
      filter: () => true,
      send: async (message) => {
        for (const chunk of Array.isArray(message) ? message : [message]) {
          const buffer = new ReadWriteByteBuffer(chunk)
          let parsed: CrdtMessage | null
          while ((parsed = readMessage(buffer))) {
            sentMessages.push(parsed)
          }
        }
      }
    }
    engine.addTransport(transport)

    for (let cycle = 0; cycle < CHURN_CYCLES; cycle++) {
      const entity = engine.addEntity()
      Transform.create(entity)
      await engine.update(1)
      engine.removeEntity(entity)
      await engine.update(1)
    }
  })

  it('should leave nothing of them in the state a late joiner is sent', () => {
    expect(dumpOf(Transform)).toEqual([])
  })

  it('should still have told the transport about each removal', () => {
    const deletes = sentMessages.filter((message) => message.type === CrdtMessageType.DELETE_COMPONENT)

    expect(deletes).toHaveLength(CHURN_CYCLES)
  })
})

describe('when a component is removed from an entity that is still alive', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let entity: Entity

  beforeEach(async () => {
    engine = Engine()
    Transform = components.Transform(engine)

    entity = engine.addEntity()
    Transform.create(entity)
    await engine.update(1)

    Transform.deleteFrom(entity)
    await engine.update(1)
  })

  it('should keep announcing the removal in the state a late joiner is sent', () => {
    const dumped = dumpOf(Transform)

    expect(dumped).toEqual([expect.objectContaining({ type: CrdtMessageType.DELETE_COMPONENT, entityId: entity })])
  })
})

describe('when an entity that still holds a component is dumped', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let entity: Entity

  beforeEach(async () => {
    engine = Engine()
    Transform = components.Transform(engine)

    entity = engine.addEntity()
    Transform.create(entity)
    await engine.update(1)
  })

  it('should be sent as a value', () => {
    const dumped = dumpOf(Transform)

    expect(dumped).toEqual([expect.objectContaining({ type: CrdtMessageType.PUT_COMPONENT, entityId: entity })])
  })
})

describe('when a component is purged from a reserved static entity', () => {
  let engine: ReturnType<typeof Engine>
  let InputModifier: ReturnType<typeof components.InputModifier>

  beforeEach(async () => {
    engine = Engine()
    InputModifier = components.InputModifier(engine)
    // PlayerEntity is reserved: removeEntity purges its components but the container
    // refuses to release the id, so no DELETE_ENTITY is ever emitted to cover them.
    InputModifier.create(engine.PlayerEntity, {} as any)
    await engine.update(1)

    engine.removeEntity(engine.PlayerEntity)
    await engine.update(1)
  })

  it('should keep announcing the component tombstone to a late joiner', () => {
    expect(dumpOf(InputModifier)).toEqual([
      expect.objectContaining({ type: CrdtMessageType.DELETE_COMPONENT, entityId: engine.PlayerEntity })
    ])
  })
})

describe('when an entity is removed twice before the delete is flushed', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let sentMessages: CrdtMessage[]
  let entity: Entity
  let timestampBeforeRemoval: number

  beforeEach(async () => {
    engine = Engine()
    Transform = components.Transform(engine)
    sentMessages = []
    const transport: Transport = {
      send: async (messages) => {
        for (const chunk of [messages].flat()) {
          const buffer = new ReadWriteByteBuffer(chunk)
          let message: CrdtMessage | null
          while ((message = readMessage(buffer))) {
            sentMessages.push(message)
          }
        }
      },
      filter: () => true
    }
    engine.addTransport(transport)

    entity = engine.addEntity()
    Transform.create(entity, { position: { x: 1, y: 2, z: 3 } } as any)
    await engine.update(1)

    const put = sentMessages.find((message) => message.type === CrdtMessageType.PUT_COMPONENT)
    timestampBeforeRemoval = (put as any).timestamp
    sentMessages = []

    // Both removals land before the update that drains the CRDT queue.
    engine.removeEntity(entity)
    engine.removeEntity(entity)
    await engine.update(1)
  })

  it('should still announce the delete with a timestamp ahead of the value it replaces', () => {
    const remove = sentMessages.find((message) => message.type === CrdtMessageType.DELETE_COMPONENT)

    expect((remove as any).timestamp).toBeGreaterThan(timestampBeforeRemoval)
  })
})
