import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import { BillboardMode } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/billboard.gen'

describe('Generated Billboard ProtoBuf', () => {
  it('should serialize/deserialize Billboard', () => {
    const newEngine = Engine()
    const { Billboard } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const billboard = Billboard.create(entity, {
      billboardMode: BillboardMode.BM_Y_AXE,
      oppositeDirection: true
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
