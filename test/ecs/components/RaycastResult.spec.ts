import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('Generated RaycastResult ProtoBuf', () => {
  it('should serialize/deserialize RaycastResult', () => {
    const newEngine = Engine()
    const RaycastResult = components.RaycastResult(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const raycastResult = RaycastResult.create(entity, {
      timestamp: 12,
      origin: { x: 1, y: 2, z: 4 },
      direction: { x: 1, y: 2, z: 4 },
      hits: [
        {
          position: { x: 1, z: 2, y: 3 },
          origin: { x: 1, z: 2, y: 3 },
          meshName: '{ x: 1, z: 2, y: 3 }',
          entityId: 123,
          normalHit: { x: 1, z: 2, y: 3 },
          length: 2,
          direction: { x: 1, z: 2, y: 3 }
        }
      ]
    })

    RaycastResult.create(entityB, {
      timestamp: 0,
      origin: undefined,
      direction: undefined,
      hits: []
    })
    const buffer = RaycastResult.toBinary(entity)
    RaycastResult.upsertFromBinary(entityB, buffer)

    expect(raycastResult).toEqual({
      ...RaycastResult.getMutable(entityB)
    })

    expect(RaycastResult.createOrReplace(entityB)).not.toEqual({
      ...RaycastResult.getMutable(entity)
    })
  })
})
