import { Entity, engine, pointerEventsSystem, Transform, MeshRenderer, MeshCollider, InputAction } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'

// Cube factory
function createCube(x: number, y: number, z: number): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })
  MeshRenderer.create(meshEntity, { mesh: { $case: 'box', box: { uvs: [] } } })
  MeshCollider.create(meshEntity, { mesh: { $case: 'box', box: {} } })

  return meshEntity
}

// Systems
function circularSystem(dt: number) {
  const entitiesWithMeshRenderer = engine.getEntitiesWith(MeshRenderer, Transform)
  for (const [entity, _meshRenderer, _transform] of entitiesWithMeshRenderer) {
    const mutableTransform = Transform.getMutable(entity)

    mutableTransform.rotation = Quaternion.multiply(
      mutableTransform.rotation,
      Quaternion.fromAngleAxis(dt * 10, Vector3.Up())
    )
  }
}

// Init
const initEntity = createCube(8, 1, 8)
pointerEventsSystem.onPointerDown(
  { entity: initEntity, opts: { button: InputAction.IA_PRIMARY, hoverText: 'Press E to spawn' } },
  () => {
    createCube(1 + Math.random() * 8, Math.random() * 8, 1 + Math.random() * 8)
  }
)

engine.addSystem(circularSystem)

export {}
