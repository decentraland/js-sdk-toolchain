import { getHeaders } from '~system/SignedFetch'

import {
  engine,
  Entity,
  InputAction,
  MeshCollider,
  MeshRenderer,
  Transform,
  pointerEventsSystem,
  executeTask
} from '@dcl/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
export * from '@dcl/sdk'

executeTask(async () => {
  const { headers } = await getHeaders({ url: 'ws://boedo.casla' })
  console.log(headers)
})

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
  { entity: initEntity, opts: { button: InputAction.IA_ANY, hoverText: 'CASLA' } },
  function (event) {
    console.log('Button: ' + event.button)
    createCube(1 + Math.random() * 8, Math.random() * 8, 1 + Math.random() * 8)
    // EventsSystem.removeOnPointerDown(initEntity)
  }
)

engine.addSystem(circularSystem)
// engine.addSystem(clickSystem)
