import { Schemas } from '../../packages/@dcl/ecs/src'
import * as components from '../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { readMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/message'
import { CrdtMessage, CrdtMessageType } from '../../packages/@dcl/ecs/src/serialization/crdt/types'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

function collect(chunks: Uint8Array[]): CrdtMessageType[] {
  const types: CrdtMessageType[] = []
  for (const chunk of chunks) {
    const buffer = new ReadWriteByteBuffer(chunk, 0)
    let message: CrdtMessage | null
    while ((message = readMessage(buffer))) types.push(message.type)
  }
  return types
}

describe('when a grow-only value is appended to a synced entity', () => {
  let engine: ReturnType<typeof Engine>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let Events: ReturnType<ReturnType<typeof Engine>['defineValueSetComponentFromSchema']>
  let sent: Uint8Array[]
  let errors: jest.SpyInstance
  let entity: Entity

  beforeEach(async () => {
    engine = Engine()
    NetworkEntity = components.NetworkEntity(engine)
    Events = engine.defineValueSetComponentFromSchema('test::events', Schemas.Map({ timestamp: Schemas.Int }), {
      timestampFunction: (value) => value.timestamp,
      maxElements: 10
    })
    sent = []
    const network: Transport = {
      type: 'network',
      filter: () => true,
      send: async (messages) => {
        for (const chunk of [messages].flat()) if (chunk.byteLength) sent.push(new Uint8Array(chunk))
      }
    }
    engine.addTransport(network)
    errors = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    entity = engine.addEntity()
    NetworkEntity.create(entity, { entityId: 5 as Entity, networkId: 1 })
    await engine.update(1)
    sent = []

    Events.addValue(entity, { timestamp: 1 } as any)
    await engine.update(1)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should still send nothing, because the protocol has no network append', () => {
    // Documenting the limitation, not endorsing it: translating the local entity id needs
    // an APPEND_VALUE_NETWORK message type that does not exist yet.
    expect(collect(sent)).not.toContain(CrdtMessageType.APPEND_VALUE)
  })

  it('should report that the append cannot cross the network', () => {
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('not sent to other players'))
  })

  it('should name the component so the cause is actionable', () => {
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('test::events'))
  })

  it('should report it only once however many appends follow', async () => {
    const before = errors.mock.calls.length

    Events.addValue(entity, { timestamp: 2 } as any)
    await engine.update(1)
    Events.addValue(entity, { timestamp: 3 } as any)
    await engine.update(1)

    expect(errors.mock.calls.length).toBe(before)
  })
})

describe('when a grow-only value is appended to an entity that is not synced', () => {
  let engine: ReturnType<typeof Engine>
  let Events: ReturnType<ReturnType<typeof Engine>['defineValueSetComponentFromSchema']>
  let sent: Uint8Array[]

  beforeEach(async () => {
    engine = Engine()
    components.NetworkEntity(engine)
    Events = engine.defineValueSetComponentFromSchema('test::events', Schemas.Map({ timestamp: Schemas.Int }), {
      timestampFunction: (value) => value.timestamp,
      maxElements: 10
    })
    sent = []
    const network: Transport = {
      type: 'network',
      filter: () => true,
      send: async (messages) => {
        for (const chunk of [messages].flat()) if (chunk.byteLength) sent.push(new Uint8Array(chunk))
      }
    }
    engine.addTransport(network)

    Events.addValue(engine.addEntity(), { timestamp: 1 } as any)
    await engine.update(1)
  })

  it('should send the append, since no id translation is needed', () => {
    expect(collect(sent)).toContain(CrdtMessageType.APPEND_VALUE)
  })
})
