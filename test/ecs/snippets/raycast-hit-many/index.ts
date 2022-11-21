import { EventsSystem } from "../../../../packages/@dcl/ecs/src";

function createCube(x: number, y: number, z: number, scaleMultiplier: number = 1) {
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
const cubeEntity2 = createCube(8, 1, 13)
const raycastEntity = engine.addEntity()

// Add OnPointerDown component to cube entity to trigger ray casting on interaction
EventsSystem.onPointerDown(cubeEntity, () => {
  Raycast.createOrReplace(raycastEntity, {
    origin: Vector3.create(8, 1, 0.1),
    direction: Vector3.create(0, 0, 1),
    maxDistance: 16,
    queryType: RaycastQueryType.RQT_QUERY_ALL
  })
}, {
  button: InputAction.IA_POINTER,
  hoverText: "CAST RAY"
})

// System to detect new raycast responses and instantiate a cube where the ray hits
var lastRaycastTimestamp = -1;
engine.addSystem(() => {
  for (const [entity, result] of engine.getEntitiesWith(RaycastResult)) {
    if (result.hits?.length == 0 || result.timestamp <= lastRaycastTimestamp) continue
    lastRaycastTimestamp = result.timestamp

    if(result.hits[0] && result.hits[0].position) {
      createCube(result.hits[0].position.x, result.hits[0].position.y, result.hits[0].position.z, 0.3)
    }

    log(`Hits (this should be '2' the first time): '${result.hits.length}'`)
  }
})

export {}

