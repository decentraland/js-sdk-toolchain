import { Engine, components, RaycastQueryType } from '../../../packages/@dcl/ecs/src'

describe('Generated Raycast ProtoBuf', () => {
  it('should serialize/deserialize Raycast', () => {
    const newEngine = Engine()
    const Raycast = components.Raycast(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const raycast = Raycast.create(entity, {
      origin: undefined,
      direction: undefined,
      maxDistance: 100,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    Raycast.create(entityB, {
      origin: undefined,
      direction: undefined,
      maxDistance: Infinity,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })
    const buffer = Raycast.toBinary(entity)
    Raycast.updateFromBinary(entityB, buffer)

    expect(raycast).toEqual({ ...Raycast.getMutable(entityB) })

    expect(Raycast.createOrReplace(entityB)).not.toEqual({
      ...Raycast.getMutable(entity)
    })
  })
})
