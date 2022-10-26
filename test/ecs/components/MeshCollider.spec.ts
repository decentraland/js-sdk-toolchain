import { PBMeshCollider } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/mesh_collider.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated MeshCollider ProtoBuf', () => {
  it('should serialize/deserialize MeshCollider', () => {
    const newEngine = Engine()
    const { MeshCollider } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const serializeComponents: PBMeshCollider[] = [
      {
        mesh: { $case: 'cylinder', cylinder: { radiusBottom: 1, radiusTop: 2 } }
      },
      {
        mesh: { $case: 'plane', plane: {} }
      },
      {
        mesh: { $case: 'box', box: {} }
      },
      {
        mesh: { $case: 'sphere', sphere: {} }
      }
    ]

    let previousData = serializeComponents[serializeComponents.length - 1]
    for (const data of serializeComponents) {
      MeshCollider.createOrReplace(entity, data)
      MeshCollider.createOrReplace(entityB, previousData)
      previousData = data

      const buffer = MeshCollider.toBinary(entity)
      MeshCollider.updateFromBinary(entityB, buffer)

      expect(MeshCollider.get(entity)).toBeDeepCloseTo({
        ...MeshCollider.getMutable(entityB)
      } as any)

      expect(MeshCollider.createOrReplace(entityB)).not.toBeDeepCloseTo({
        ...MeshCollider.getMutable(entity)
      } as any)
    }
  })
})
