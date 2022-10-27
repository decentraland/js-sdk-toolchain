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

function clickSystem() {
  if (Input.wasJustClicked(InputAction.IA_ANY, initEntity)) {
    log('Was Just Clicked')
  }
  if (Input.wasJustClicked(InputAction.IA_ACTION_3, initEntity)) {
    log('Was Just Clicked', 'Action 3')
  }
  if (Input.wasJustClicked(InputAction.IA_POINTER, initEntity)) {
    log('Was Just Clicked', 'Pointer')
  }
  if (Input.wasJustClicked(InputAction.IA_PRIMARY, initEntity)) {
    log('Was Just Clicked', 'Primary')
  }
  if (Input.wasJustClicked(InputAction.IA_JUMP, initEntity)) {
    log('Was Just Clicked', 'Jump')
  }
  if (Input.wasJustClicked(InputAction.IA_LEFT, initEntity)) {
    log('Was Just Clicked', 'Left')
  }
}

// Init
const initEntity = createCube(8, 1, 8)

EventsSystem.onPointerDown(
  initEntity,
  function (event) {
    log('Button: ', event.button)
    createCube(1 + Math.random() * 8, Math.random() * 8, 1 + Math.random() * 8)
    // EventsSystem.removeOnPointerDown(initEntity)
  },
  {
    button: InputAction.IA_ANY,
    hoverText: 'CASLA - BOEDO'
  }
)

engine.addSystem(circularSystem)
// engine.addSystem(clickSystem)
