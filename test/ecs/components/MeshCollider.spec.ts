import { PBMeshCollider } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/mesh_collider.gen'
import { Engine, components, ColliderLayer } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated MeshCollider ProtoBuf', () => {
  it('should serialize/deserialize MeshCollider', () => {
    const newEngine = Engine()
    const MeshCollider = components.MeshCollider(newEngine)

    const serializeComponents: PBMeshCollider[] = [
      {
        collisionMask: undefined,
        mesh: { $case: 'cylinder', cylinder: { radiusBottom: 1, radiusTop: 2 } }
      },
      {
        collisionMask: undefined,
        mesh: { $case: 'plane', plane: {} }
      },
      {
        collisionMask: undefined,
        mesh: { $case: 'box', box: {} }
      },
      {
        collisionMask: undefined,
        mesh: { $case: 'sphere', sphere: {} }
      }
    ]

    for (const data of serializeComponents) {
      testComponentSerialization(MeshCollider, data)
    }
  })

  it('should helper creates box MeshCollider', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const MeshCollider = components.MeshCollider(newEngine)

    expect(MeshCollider.getOrNull(entity)).toBe(null)
    MeshCollider.setBox(entity)

    expect(MeshCollider.getOrNull(entity)).not.toBe(null)
  })

  it('should helper test all datas', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const MeshCollider = components.MeshCollider(newEngine)

    MeshCollider.setBox(entity, ColliderLayer.CL_PHYSICS)
    expect(MeshCollider.get(entity)).toStrictEqual({
      collisionMask: ColliderLayer.CL_PHYSICS,
      mesh: {
        $case: 'box',
        box: {}
      }
    })

    MeshCollider.setCylinder(entity, 1, 0, ColliderLayer.CL_PHYSICS)
    expect(MeshCollider.get(entity)).toStrictEqual({
      collisionMask: ColliderLayer.CL_PHYSICS,
      mesh: {
        $case: 'cylinder',
        cylinder: {
          radiusBottom: 1,
          radiusTop: 0
        }
      }
    })

    MeshCollider.setSphere(entity, ColliderLayer.CL_POINTER)
    expect(MeshCollider.get(entity)).toStrictEqual({
      collisionMask: ColliderLayer.CL_POINTER,
      mesh: {
        $case: 'sphere',
        sphere: {}
      }
    })

    MeshCollider.setPlane(entity, [ColliderLayer.CL_POINTER, ColliderLayer.CL_PHYSICS])
    expect(MeshCollider.get(entity)).toStrictEqual({
      collisionMask: ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS,
      mesh: {
        $case: 'plane',
        plane: {}
      }
    })
  })

  it('getCollisionMask combines CL_PLAYER and CL_MAIN_PLAYER into bitfield 12', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const MeshCollider = components.MeshCollider(newEngine)

    // CL_PLAYER = 4, CL_MAIN_PLAYER = 8 => OR = 12
    MeshCollider.setBox(entity, [ColliderLayer.CL_PLAYER, ColliderLayer.CL_MAIN_PLAYER])
    expect(MeshCollider.get(entity)).toStrictEqual({
      collisionMask: 12,
      mesh: {
        $case: 'box',
        box: {}
      }
    })
    expect(ColliderLayer.CL_PLAYER | ColliderLayer.CL_MAIN_PLAYER).toBe(12)
  })
})
