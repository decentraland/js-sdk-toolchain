const CubeComponent = engine.defineComponent(
  {
    t: Schemas.Float
  },
  212
)

const RaycasterComponent = engine.defineComponent(
  {
    ts: Schemas.Int,
    t: Schemas.Float
  },
  213
)

function createCube(x: number, y: number, z: number) {
  const cubeEntity = engine.addEntity()

  Transform.create(cubeEntity, { position: { x, y, z } })
  CubeComponent.create(cubeEntity)

  MeshRenderer.create(cubeEntity, { mesh: { $case: 'box', box: { uvs: [] } } })
  MeshCollider.create(cubeEntity, { mesh: { $case: 'box', box: {} } })

  // This should be removed and keep working ok!
  // TODO: see physics layers
  PointerEvents.create(cubeEntity)
  return cubeEntity
}

engine.addSystem((dt) => {
  for (const [entity] of engine.getEntitiesWith(RaycasterComponent)) {
    const raycaster = RaycasterComponent.getMutable(entity)
    raycaster.t += dt

    if (raycaster.t > 0.1) {
      raycaster.ts++
      raycaster.t = 0

      Raycast.createOrReplace(entity, {
        timestamp: raycaster.ts,
        origin: Vector3.create(8, 1, 0),
        direction: Vector3.create(0, 0, 1),
        maxDistance: 16,
        queryType: RaycastQueryType.RQT_HIT_FIRST
      })
    }
  }

  for (const [_, result] of engine.getEntitiesWith(RaycastResult)) {
    log(result.hits.length)
  }
})

engine.addSystem((dt) => {
  for (const [entity, cube] of engine.getEntitiesWith(
    CubeComponent,
    Transform
  )) {
    CubeComponent.getMutable(entity).t += dt
    Transform.getMutable(entity).position.y = 2 + Math.cos(cube.t)
  }
})

// Init
createCube(8, 1, 8)
RaycasterComponent.create(engine.addEntity())

export {}
