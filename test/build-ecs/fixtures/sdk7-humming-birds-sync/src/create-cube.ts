import {
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  PointerEvents,
  PointerEventType,
  InputAction,
  engine,
  inputSystem
} from '@dcl/ecs'
import { Color4 } from '@dcl/sdk/math'
import { syncEntity } from './message-bus-sync'
import { SyncEntities } from './sync-enum'

// Cube factory
export const Cube = engine.defineComponent('cube', {})
export function createTriangle(x: number, y: number, z: number, sync: boolean = true) {
  const entity = createCube(x, y, z, sync)
  MeshRenderer.setCylinder(entity, 1, 0)
  MeshCollider.setCylinder(entity, 1, 0)
  return entity
}

export function createCircle(x: number, y: number, z: number, sync: boolean = true) {
  const entity = createCube(x, y, z, sync)
  MeshRenderer.setCylinder(entity, 1, 1)
  MeshCollider.setCylinder(entity, 1, 1)
  return entity
}

export function createCube(x: number, y: number, z: number, sync: boolean = true, syncId?: number): Entity {
  const entity = engine.addEntity()
  // Used to track the cubes
  Cube.create(entity)

  Transform.create(entity, { position: { x, y, z } })
  // set how the cube looks and collides
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)

  if (sync) {
    syncEntity(entity, [Material.componentId], syncId)
  }

  PointerEvents.create(entity, {
    pointerEvents: [
      { eventType: PointerEventType.PET_DOWN, eventInfo: { button: InputAction.IA_POINTER, hoverText: 'Change Color' } }
    ]
  })

  return entity
}

export function getRandomHexColor(): string {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

export function changeColorSystem() {
  for (const [entity] of engine.getEntitiesWith(Cube, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
      Material.setPbrMaterial(entity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })
    }
  }
}

export function createCubes() {
  createCube(44, 1, 26, true, SyncEntities.CUBE_1)
  createCube(36, 2, 37, true, SyncEntities.CUBE_2)
  createCube(20, 3, 40, true, SyncEntities.CUBE_3)
}
