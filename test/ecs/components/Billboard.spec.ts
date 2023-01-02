import {
  Engine,
  components,
  BillboardMode
} from '../../../packages/@dcl/ecs/src'

describe('Generated Billboard ProtoBuf', () => {
  it('should serialize/deserialize Billboard', () => {
    const newEngine = Engine()
    const Billboard = components.Billboard(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const billboard = Billboard.create(entity, {
      billboardMode: BillboardMode.BM_Y
    })

    Billboard.create(entityB)
    const buffer = Billboard.toBinary(entity)
    Billboard.updateFromBinary(entityB, buffer)

    expect(billboard).toBeDeepCloseTo({ ...Billboard.getMutable(entityB) })

    expect(Billboard.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...Billboard.getMutable(entity)
    })
  })
})
