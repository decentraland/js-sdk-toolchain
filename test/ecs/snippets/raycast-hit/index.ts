import {
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  InputAction,
  pointerEventsSystem,
  Vector3,
  Raycast,
  RaycastQueryType,
  RaycastResult
} from '@dcl/ecs'

function createCube(
  x: number,
  y: number,
  z: number,
  scaleMultiplier: number = 1
) {
  const cubeEntity = engine.addEntity()

  Transform.create(cubeEntity, {
    position: { x, y, z },
    scale: { x: scaleMultiplier, y: scaleMultiplier, z: scaleMultiplier }
  })

  MeshRenderer.create(cubeEntity, { mesh: { $case: 'box', box: { uvs: [] } } })
  MeshCollider.create(cubeEntity, { mesh: { $case: 'box', box: {} } })

  return cubeEntity
}

// Create cube to hit
const cubeEntity = createCube(8, 1, 8)
const raycastEntity = engine.addEntity()

// Add OnPointerDown component to cube entity to trigger ray casting on interaction
pointerEventsSystem.onPointerDown(
  cubeEntity,
  () => {
    Raycast.createOrReplace(raycastEntity, {
      origin: Vector3.create(8, 1, 0.1),
      direction: Vector3.create(0, 0, 1),
      maxDistance: 16,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })
  },
  {
    button: InputAction.IA_POINTER,
    hoverText: 'CAST RAY'
  }
)

// System to detect new raycast responses and instantiate a cube where the ray hits
let lastRaycastTimestamp = -1
engine.addSystem(() => {
  for (const [_entity, result] of engine.getEntitiesWith(RaycastResult)) {
    if (result.hits?.length === 0 || result.timestamp <= lastRaycastTimestamp)
      continue
    lastRaycastTimestamp = result.timestamp

    if (result.hits[0] && result.hits[0].position) {
      createCube(
        result.hits[0].position.x,
        result.hits[0].position.y,
        result.hits[0].position.z,
        0.3
      )
    }

    console.log(`Hits (this should be '1'): '${result.hits.length}'`)
  }
})

export {}
