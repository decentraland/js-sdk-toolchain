import { ensureEngineAndComponents } from './utils'

describe('Generated Billboard ProtoBuf', () => {
  it('should serialize/deserialize Billboard', async () => {
    const {
      engine: newEngine,
      components: { Billboard }
    } = await ensureEngineAndComponents()

    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const billboard = Billboard.create(entity, {
      x: true,
      y: true,
      z: true
    })

    Billboard.create(entityB, {
      x: false,
      y: false,
      z: false
    })
    const buffer = Billboard.toBinary(entity)
    Billboard.updateFromBinary(entityB, buffer)

    expect(billboard).toBeDeepCloseTo({ ...Billboard.mutable(entityB) })

    expect(Billboard.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...Billboard.mutable(entity)
    })
  })
})
