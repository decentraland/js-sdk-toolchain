// Cube factory
function createCube(x: number, y: number, z: number, spawner = true): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })
  MeshRenderer.create(meshEntity, { box: { uvs: [] } })
  MeshCollider.create(meshEntity, { box: {} })
  if (spawner) {
    PointerEvents.create(meshEntity, {
      pointerEvents: [
        {
          eventType: PointerEventType.PET_DOWN,
          eventInfo: {
            button: InputAction.IA_PRIMARY,
            hoverText: 'Press E to spawn',
            maxDistance: 100,
            showFeedback: true
          }
        }
      ]
    })
  }
  return meshEntity
}

// Systems
function circularSystem(dt: number) {
  const entitiesWithMeshRenderer = engine.getEntitiesWith(
    MeshRenderer,
    Transform
  )
  for (const [entity, _meshRenderer, _transform] of entitiesWithMeshRenderer) {
    const mutableTransform = Transform.getMutable(entity)

    mutableTransform.rotation = Quaternion.multiply(
      mutableTransform.rotation,
      Quaternion.fromAngleAxis(dt * 10, Vector3.Up())
    )
  }
}

function spawnerSystem() {
  const clickedCubes = engine.getEntitiesWith(PointerEvents)
  for (const [entity] of clickedCubes) {
    if (Input.wasJustClicked(InputAction.IA_PRIMARY, entity)) {
      createCube(
        1 + Math.random() * 8,
        Math.random() * 8,
        1 + Math.random() * 8,
        false
      )
    }
  }
}

// Init
createCube(8, 1, 8)
engine.addSystem(circularSystem)
engine.addSystem(spawnerSystem)

export {}
