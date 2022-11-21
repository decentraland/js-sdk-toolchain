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

  it('should helper creates box MeshRenderer', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const { MeshRenderer } = newEngine.baseComponents

    expect(MeshRenderer.getOrNull(entity)).toBe(null)
    MeshRenderer.setBox(entity)

    expect(MeshRenderer.getOrNull(entity)).not.toBe(null)
  })

  it('should helper test all datas', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const { MeshRenderer } = newEngine.baseComponents

    MeshRenderer.setBox(entity, [1, 2, 3])
    expect(MeshRenderer.get(entity)).toStrictEqual({
      mesh: {
        $case: 'box',
        box: {
          uvs: [1, 2, 3]
        }
      }
    })

    MeshRenderer.setCylinder(entity, 1, 0)
    expect(MeshRenderer.get(entity)).toStrictEqual({
      mesh: {
        $case: 'cylinder',
        cylinder: {
          radiusBottom: 1,
          radiusTop: 0
        }
      }
    })

    MeshRenderer.setSphere(entity)
    expect(MeshRenderer.get(entity)).toStrictEqual({
      mesh: {
        $case: 'sphere',
        sphere: {}
      }
    })

    MeshRenderer.setPlane(entity, [4, 5, 6])
    expect(MeshRenderer.get(entity)).toStrictEqual({
      mesh: {
        $case: 'plane',
        plane: {
          uvs: [4, 5, 6]
        }
      }
    })

    MeshRenderer.setPlane(entity)
    expect(MeshRenderer.get(entity)).toStrictEqual({
      mesh: {
        $case: 'plane',
        plane: {
          uvs: []
        }
      }
    })
  })
})
