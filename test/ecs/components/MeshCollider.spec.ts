import { ColliderLayer } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/mesh_collider.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import { makeCollisionMask } from '../../../packages/@dcl/ecs/src/components'

describe('Generated MeshCollider ProtoBuf', () => {
  it('should serialize/deserialize MeshCollider', () => {
    const newEngine = Engine()
    const { MeshCollider } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _meshCollider = MeshCollider.create(entity, {
      mesh: { $case: 'cylinder', cylinder: { radiusBottom: 1, radiusTop: 2 } },
      collisionMask: ColliderLayer.CL_POINTER
    })

    MeshCollider.create(entityB, {
      mesh: { $case: 'plane', plane: {} },
      collisionMask: makeCollisionMask(
        ColliderLayer.CL_POINTER,
        ColliderLayer.CL_PHYSICS
      )
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
