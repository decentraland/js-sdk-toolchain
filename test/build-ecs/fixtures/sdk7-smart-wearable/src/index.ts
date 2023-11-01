import {
  engine,
  Entity,
  InputAction,
  MeshCollider,
  MeshRenderer,
  Transform,
  pointerEventsSystem,
  SyncComponents,
  Schemas,
  Material,
  PointerEvents,
  PointerEventType,
  inputSystem
} from '@dcl/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'

const Door = engine.defineComponent('door', { open: Schemas.Boolean })

export function getRandomHexColor(): string {
  const letters = '012345789ABC sDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

// Cube factory
function createCube(x: number, y: number, z: number): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })
  MeshRenderer.create(meshEntity, { mesh: { $case: 'box', box: { uvs: [] } } })
  MeshCollider.create(meshEntity, { mesh: { $case: 'box', box: {} } })
  Material.setPbrMaterial(meshEntity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })

  Door.create(meshEntity, { open: false })

  SyncComponents.create(meshEntity, { componentIds: [Door.componentId, Material.componentId] })

  PointerEvents.create(meshEntity, {
    pointerEvents: [
      { eventType: PointerEventType.PET_DOWN, eventInfo: { button: InputAction.IA_POINTER, hoverText: 'Change Color' } }
    ]
  })

  return meshEntity
}

function changeColorSystem() {
  for (const [entity] of engine.getEntitiesWith(Door, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
      Material.setPbrMaterial(entity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })
      const door = Door.getMutable(entity)
      door.open = !door.open
      console.log(`The door was ${door.open ? 'opened' : 'closed'}`)
    }
  }
}

// Systems
function circularSystem(dt: number) {
  const entitiesWithMeshRenderer = engine.getEntitiesWith(MeshRenderer, Transform)
  for (const [entity, _meshRenderer, _transform] of entitiesWithMeshRenderer) {
    const mutableTransform = Transform.getMutable(entity)
    mutableTransform.rotation = Quaternion.multiply(
      mutableTransform.rotation,
      Quaternion.fromAngleAxis(dt * 1, Vector3.Up())
    )
  }
}

export function main() {
  const initEntity = createCube(8, 1, 8)

  pointerEventsSystem.onPointerDown(
    { entity: initEntity, opts: { button: InputAction.IA_POINTER, hoverText: 'CASLA' } },
    function () {
      createCube(1 + Math.random() * 8, Math.random() * 8, 1 + Math.random() * 8)
    }
  )

  engine.addSystem(circularSystem)
  engine.addSystem(changeColorSystem)
}
