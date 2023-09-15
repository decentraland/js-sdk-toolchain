import { Entity, Schemas, engine, SyncComponents } from '../../../packages/@dcl/ecs'
import { engineToCrdt } from '../../../packages/@dcl/sdk/network-transport/state'
import { serializeCrdtMessages } from '../../../packages/@dcl/sdk/internal/transports/logger'

describe('It should dump the engine to a crdt buffer', () => {
  it('Should dump the state', async () => {
    // const engine = Engine()
    const Component = engine.defineComponent('myComponent', { id: Schemas.String })

    // Entity that should be added to the dump
    const entity = engine.addEntity()
    Component.create(entity, { id: 'boedo' })
    SyncComponents.create(entity)

    // Ignore this entity
    const fakeEntity = 10 as Entity
    Component.create(fakeEntity)

    // Update dirty values
    await engine.update(1)

    const crdtBuffer = engineToCrdt(engine)

    expect(Array.from(serializeCrdtMessages('test', crdtBuffer, engine))).toHaveLength(2)
    expect(crdtBuffer).toEqual(
      new Uint8Array([
        28, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 73, 211, 157, 133, 1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 33, 0, 0, 0, 1, 0,
        0, 0, 0, 2, 0, 0, 15, 104, 23, 51, 1, 0, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 98, 111, 101, 100, 111
      ])
    )
  })
})

export async function pepe() {
  const a: any[] = []
  try {
    await engine.update(1)
    return a
  } catch (e) {
    console.log('asd')
  }
}
