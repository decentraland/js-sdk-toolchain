import { QueryType } from '../../src/components/generated/pb/Raycast.gen'
import { Engine } from '../../src/engine'

describe('Generated Raycast ProtoBuf', () => {
  it('should serialize/deserialize Raycast', () => {
    const newEngine = Engine()
    const { Raycast } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const raycast = Raycast.create(entity, {
      timestamp: 12,
      origin: undefined,
      direction: undefined,
      maxDistance: 100,
      queryType: QueryType.HIT_FIRST
    })

    Raycast.create(entityB, {
      timestamp: 0,
      origin: undefined,
      direction: undefined,
      maxDistance: Infinity,
      queryType: QueryType.HIT_FIRST
    })
    const buffer = Raycast.toBinary(entity)
    Raycast.updateFromBinary(entityB, buffer)

    expect(raycast).toBeDeepCloseTo({ ...(Raycast.getMutable(entityB) as any) })

    expect(Raycast.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...(Raycast.getMutable(entity) as any)
    })
  })
})
