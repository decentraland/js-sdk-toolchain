import { ColliderLayer } from '../../src/components/generated/pb/MeshCollider.gen'
import { Engine } from '../../src/engine'

describe('Generated MeshCollider ProtoBuf', () => {
  it('should serialize/deserialize MeshCollider', () => {
    const newEngine = Engine()
    const { MeshCollider } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _meshCollider = MeshCollider.create(entity, {
      box: {},
      sphere: undefined,
      cylinder: { radiusBottom: 1, radiusTop: 2 },
      plane: undefined,
      collisionMask: undefined
    })

    MeshCollider.create(entityB, {
      sphere: {},
      box: undefined,
      cylinder: undefined,
      plane: {},
      collisionMask: ColliderLayer.Physics
    })
    const buffer = MeshCollider.toBinary(entity)
    MeshCollider.updateFromBinary(entityB, buffer)

    expect(_meshCollider).toBeDeepCloseTo({
      ...MeshCollider.getMutable(entityB)
    } as any)

    expect(MeshCollider.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...MeshCollider.getMutable(entity)
    } as any)
  })
})
