import { Engine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../../../packages/@dcl/ecs/src/engine/entity'
import { IEngine, Transport } from '../../../../packages/@dcl/ecs/src'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { createServerValidator } from '../../../../packages/@dcl/sdk/network/server'
import { CommsMessage } from '../../../../packages/@dcl/sdk/network/binary-message-bus'
import { NOT_SYNC_COMPONENTS_IDS } from '../../../../packages/@dcl/sdk/src/network/state'

const NETWORK_ID = 7
const PEER = 'peer'

describe('when a peer sends a component the scene never synchronises', () => {
  let engine: IEngine
  let transport: Transport
  let validator: ReturnType<typeof createServerValidator>
  let UiTransform: ReturnType<typeof components.UiTransform>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let relayed: number[]

  function chunk(entityId: number, componentId: number, data: Uint8Array): Uint8Array {
    const buf = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(entityId as Entity, 1, componentId, NETWORK_ID, data, buf)
    return buf.toBinary()
  }

  function serialized(component: { schema: any }, value: unknown): Uint8Array {
    const data = new ReadWriteByteBuffer()
    component.schema.serialize(value, data)
    return data.toBinary()
  }

  async function feed(bytes: Uint8Array) {
    const applied = validator.processServerMessages(bytes, PEER)
    if (applied.byteLength) transport.onmessage!(applied)
    await engine.update(1)
  }

  function mapped(): Entity | undefined {
    return Array.from(engine.getEntitiesWith(NetworkEntity))[0]?.[0]
  }

  beforeEach(() => {
    engine = Engine()
    transport = { type: 'network', filter: () => false, send: async () => {} }
    engine.addTransport(transport)
    Transform = components.Transform(engine)
    UiTransform = components.UiTransform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    components.NetworkParent(engine)
    components.CreatedBy(engine)
    relayed = []
    validator = createServerValidator({
      engine,
      binaryMessageBus: { emit: (type: number) => relayed.push(type), on: () => {} } as any
    })
  })

  it('should have UiTransform on the never-sync list', () => {
    expect(NOT_SYNC_COMPONENTS_IDS).toContain(UiTransform.componentId)
  })

  describe('and it is a never-sync component', () => {
    beforeEach(async () => {
      await feed(chunk(900, UiTransform.componentId, serialized(UiTransform, UiTransform.schema.create())))
    })

    it('should not apply it on the server', () => {
      const entity = mapped()
      expect(entity === undefined || UiTransform.getOrNull(entity) === null).toBe(true)
    })

    it('should not relay it to the other peers', () => {
      expect(relayed.filter((type) => type === CommsMessage.CRDT)).toEqual([])
    })
  })

  describe('and it is a component the scene does synchronise', () => {
    beforeEach(async () => {
      await feed(
        chunk(
          901,
          Transform.componentId,
          serialized(Transform, {
            position: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
            parent: 0 as Entity
          })
        )
      )
    })

    it('should relay it to the other peers', () => {
      expect(relayed.filter((type) => type === CommsMessage.CRDT).length).toBeGreaterThan(0)
    })
  })
})
