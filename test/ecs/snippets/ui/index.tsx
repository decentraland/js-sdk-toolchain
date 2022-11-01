import ReactEcs, {
  renderUi,
  UiEntity,
  YGAlign,
  YGDisplay,
  YGJustify
} from '@dcl/react-ecs'

let counter = 0

export const uiComponent = () => (
  <UiEntity
    uiTransform={{
      width: 700,
      height: 400,
      margin: { top: '35px', left: '500px' }
    }}
    uiBackground={{ backgroundColor: Color4.create(0.5, 0.8, 0.1, 0.6) }}
  >
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '20%',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <UiEntity
        uiText={{ value: 'SDK 7', fontSize: 80 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '20%',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <UiEntity
        uiText={{ value: `Counter: ${counter}`, fontSize: 60 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100px',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <UiEntity
        uiText={{ value: `Player: ${getPlayerPosition()}`, fontSize: 40 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
  </UiEntity>
)

function getPlayerPosition() {
  const playerPosition = Transform.getOrNull(engine.PlayerEntity)
  if (!playerPosition) return ''
  const { x, y, z } = playerPosition.position
  return `{x: ${x.toFixed(2)}, y: ${y.toFixed(2)}, z: ${z.toFixed(2)} }`
}

renderUi(uiComponent)

// Cube factory
function createCube(x: number, y: number, z: number, spawner = true): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })
  MeshRenderer.create(meshEntity, { mesh: { $case: 'box', box: { uvs: [] } } })
  MeshCollider.create(meshEntity, { mesh: { $case: 'box', box: {} } })
  if (spawner) {
    PointerHoverFeedback.create(meshEntity, {
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
  const clickedCubes = engine.getEntitiesWith(PointerHoverFeedback)
  for (const [entity] of clickedCubes) {
    if (
      Input.isActive(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, entity)
    ) {
      counter++
    }
  }
}

// Init
createCube(8, 1, 8)
engine.addSystem(circularSystem)
engine.addSystem(spawnerSystem)

export {}
