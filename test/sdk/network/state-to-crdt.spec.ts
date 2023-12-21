import { Entity, Schemas, engine, SyncComponents, NetworkEntity } from '../../../packages/@dcl/ecs/dist'
import { engineToCrdt } from '../../../packages/@dcl/sdk/network/state'
import { serializeCrdtMessages } from '../../../packages/@dcl/sdk/internal/transports/logger'

describe('It should dump the engine to a crdt buffer', () => {
  it('Should dump the state', async () => {
    // const engine = Engine()
    const Component = engine.defineComponent('myComponent', { id: Schemas.String })

    // Entity that should be added to the dump
    const entity = engine.addEntity()
    NetworkEntity.create(entity, { networkId: 1, entityId: entity })
    Component.create(entity, { id: 'boedo' })
    SyncComponents.create(entity)

    // Ignore this entity
    const fakeEntity = 10 as Entity
    Component.create(fakeEntity)

    // Update dirty values
    await engine.update(1)

    const crdtBuffer = engineToCrdt(engine)
    expect(Array.from(serializeCrdtMessages('test', crdtBuffer, engine))).toHaveLength(3)
  })
})
