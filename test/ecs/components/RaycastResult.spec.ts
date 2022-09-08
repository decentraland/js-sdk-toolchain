import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated RaycastResult ProtoBuf', () => {
  it('should serialize/deserialize RaycastResult', () => {
    const newEngine = Engine()
    const { RaycastResult } = newEngine.baseComponents
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
    RaycastResult.updateFromBinary(entityB, buffer)

    expect(raycastResult).toBeDeepCloseTo({
      ...(RaycastResult.getMutable(entityB) as any)
    })

    expect(RaycastResult.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...(RaycastResult.getMutable(entity) as any)
    })
  })
})
