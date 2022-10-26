import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import type { PBMeshRenderer } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/mesh_renderer.gen'

describe('Generated MeshRenderer ProtoBuf', () => {
  it('should serialize/deserialize MeshRenderer', () => {
    const newEngine = Engine()
    const { MeshRenderer } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const serializeComponents: PBMeshRenderer[] = [
      {
        mesh: { $case: 'cylinder', cylinder: { radiusBottom: 1, radiusTop: 2 } }
      },
      {
        mesh: { $case: 'plane', plane: { uvs: [1, 1, 1, 1] } }
      },
      {
        mesh: { $case: 'box', box: { uvs: [1, 1, 1, 1] } }
      },
      {
        mesh: { $case: 'sphere', sphere: {} }
      }
    ]

    let previousData = serializeComponents[serializeComponents.length - 1]
    for (const data of serializeComponents) {
      MeshRenderer.createOrReplace(entity, data)
      MeshRenderer.createOrReplace(entityB, previousData)
      previousData = data

      const buffer = MeshRenderer.toBinary(entity)
      MeshRenderer.updateFromBinary(entityB, buffer)

      expect(MeshRenderer.get(entity)).toBeDeepCloseTo({
        ...MeshRenderer.getMutable(entityB)
      } as any)

      expect(MeshRenderer.createOrReplace(entityB)).not.toBeDeepCloseTo({
        ...MeshRenderer.getMutable(entity)
      } as any)
    }
  })
})
