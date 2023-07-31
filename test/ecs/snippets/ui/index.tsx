/* eslint-disable no-console */
import {
  Entity,
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  InputAction,
  PointerEvents,
  PointerEventType
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
import { ReactEcs, UiEntity, Label, ReactEcsRenderer, Button } from '@dcl/sdk/react-ecs'

// Cube factory
function createCube(x: number, y: number, z: number, spawner = true): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })
  MeshRenderer.create(meshEntity, { mesh: { $case: 'box', box: { uvs: [] } } })
  MeshCollider.create(meshEntity, { mesh: { $case: 'box', box: {} } })
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
createCube(8, 1, 8)
engine.addSystem(circularSystem)

const sceneThumbnail = 'models/Magazinev1.png'

const uiComponent = () => (
  <UiEntity
    uiTransform={{
      width: 400,
      height: 230,
      //  { top: 16, right: 0, bottom: 8 left: 270 },
      margin: '16px 0 8px 270px',
      // { top: 4, bottom: 4, left: 4, right: 4 },
      padding: 4
    }}
    uiBackground={{ color: Color4.create(0.5, 0.8, 0.1, 0.6) }}
  >
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
      uiBackground={{ color: Color4.fromHexString('#70ac76ff') }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 50,
          margin: '8px 0'
        }}
        uiBackground={{
          textureMode: 'center',
          texture: {
            src: sceneThumbnail
          }
        }}
        uiText={{ value: 'SDK7', fontSize: 18 }}
      />
      <Label
        onMouseDown={() => {
          console.log('Player Position clicked !')
        }}
        value={`Player: ${getPlayerPosition()}`}
        fontSize={18}
        uiTransform={{ width: '100%', height: 30 }}
      />
      <Label
        onMouseDown={() => {
          console.log('# Cubes clicked !')
        }}
        value={`# Cubes: ${[...engine.getEntitiesWith(MeshRenderer)].length}`}
        fontSize={18}
        uiTransform={{ width: '100%', height: 30 }}
      />
      <Button
        uiTransform={{ width: 100, height: 40, margin: 8 }}
        value="Spawn cube"
        variant="primary"
        fontSize={14}
        onMouseDown={() => {
          createCube(1 + Math.random() * 8, Math.random() * 8, 1 + Math.random() * 8, false)
        }}
      />
    </UiEntity>
  </UiEntity>
)

function getPlayerPosition() {
  const playerPosition = Transform.getOrNull(engine.PlayerEntity)
  if (!playerPosition) return ' no data yet'
  const { x, y, z } = playerPosition.position
  return `{X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, z: ${z.toFixed(2)} }`
}

ReactEcsRenderer.setUiRenderer(uiComponent)

export {}
