import { Engine } from '../../src/engine'

describe('Generated Billboard ProtoBuf', () => {
  it('should serialize/deserialize Billboard', () => {
    const newEngine = Engine()
    const { Billboard } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const billboard = Billboard.create(entity, {
      x: 0,
      y: 1,
      z: 3
    })

    Billboard.create(entityB, {
      x: 4,
      y: 5,
      z: 6
    })
    const buffer = Billboard.toBinary(entity)
    Billboard.updateFromBinary(entityB, buffer)

    expect(billboard).toBeDeepCloseTo({ ...Billboard.mutable(entityB) })

    expect(Billboard.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...Billboard.mutable(entity)
    })
  })
})
