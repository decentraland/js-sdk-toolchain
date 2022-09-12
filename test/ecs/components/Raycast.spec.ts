import { RaycastQueryType } from '../../../packages/@dcl/ecs/src/components/generated/pb/Raycast.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

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
      queryType: RaycastQueryType.HIT_FIRST
    })

    Raycast.create(entityB, {
      timestamp: 0,
      origin: undefined,
      direction: undefined,
      maxDistance: Infinity,
      queryType: RaycastQueryType.HIT_FIRST
    })
    const buffer = Raycast.toBinary(entity)
    Raycast.updateFromBinary(entityB, buffer)

    expect(raycast).toBeDeepCloseTo({ ...(Raycast.getMutable(entityB) as any) })

    expect(Raycast.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...(Raycast.getMutable(entity) as any)
    })
  })
})
