import { engine, Transform, MeshRenderer, MeshCollider } from '@dcl/sdk/ecs'

enum Mesh {
  BOX,
  CYLINDER,
  SPHERE,
  CONE
}

function createMesh(x: number, y: number, z: number, mesh: Mesh, withCollider: boolean = false) {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })

  switch (mesh) {
    case Mesh.BOX:
      MeshRenderer.create(meshEntity, {
        mesh: { $case: 'box', box: { uvs: [] } }
      })
      if (withCollider) MeshCollider.create(meshEntity, { mesh: { $case: 'box', box: {} } })
      break
    case Mesh.SPHERE:
      MeshRenderer.create(meshEntity, { mesh: { $case: 'sphere', sphere: {} } })
      if (withCollider)
        MeshCollider.create(meshEntity, {
          mesh: { $case: 'sphere', sphere: {} }
        })
      break
    case Mesh.CONE:
    case Mesh.CYLINDER:
      MeshRenderer.create(meshEntity, {
        mesh: {
          $case: 'cylinder',
          cylinder: {
            radiusBottom: 1,
            radiusTop: mesh === Mesh.CONE ? 0 : 1
          }
        }
      })
      if (withCollider)
        MeshCollider.create(meshEntity, {
          mesh: {
            $case: 'cylinder',
            cylinder: {
              radiusBottom: 1,
              radiusTop: mesh === Mesh.CONE ? 0 : 1
            }
          }
        })
      break
  }
  return meshEntity
}

createMesh(15, 1, 15, Mesh.BOX)
createMesh(12, 1, 15, Mesh.CONE)
createMesh(9, 1, 15, Mesh.SPHERE)
createMesh(6, 1, 15, Mesh.CYLINDER)
createMesh(15, 1, 1, Mesh.BOX, true)
createMesh(12, 1, 1, Mesh.CONE, true)
createMesh(9, 1, 1, Mesh.SPHERE, true)
createMesh(6, 1, 1, Mesh.CYLINDER, true)

export {}
