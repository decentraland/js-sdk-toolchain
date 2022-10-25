function createCube(x: number, y: number, z: number) {
  const cubeEntity = engine.addEntity()

  Transform.create(cubeEntity, { position: { x, y, z } })

  MeshRenderer.create(cubeEntity, { box: { uvs: [] } })
  MeshCollider.create(cubeEntity, { box: {} })

  // This should be removed and keep working ok!
  // TODO: see physics layers
  PointerHoverFeedback.create(cubeEntity)
  return cubeEntity
}

engine.addSystem(() => {
  for (const [_, result] of engine.getEntitiesWith(RaycastResult)) {
    log(`This should be '2': '${result.hits.length}'`)
  }
})

// Init
createCube(8, 1, 8)
createCube(8, 1, 4)

Raycast.createOrReplace(engine.addEntity(), {
  timestamp: 123,
  origin: Vector3.create(8, 1, 0),
  direction: Vector3.create(0, 0, 1),
  maxDistance: 16,
  queryType: RaycastQueryType.RQT_QUERY_ALL
})

export {}
