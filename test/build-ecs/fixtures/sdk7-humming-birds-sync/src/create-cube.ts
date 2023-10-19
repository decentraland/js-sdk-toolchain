import {
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  SyncComponents,
  PointerEvents,
  PointerEventType,
  InputAction,
  engine,
  inputSystem
} from '@dcl/ecs'
import { Color4 } from '@dcl/sdk/math'
import { NetworkManager } from '@dcl/sdk/network-transport/types'

// Cube factory
export const Cube = engine.defineComponent('cube', {})
export function createTriangle(entityFactory: NetworkManager, x: number, y: number, z: number, sync: boolean = true) {
  const entity = createCube(entityFactory, x, y, z, sync)
  MeshRenderer.setCylinder(entity, 1, 0)
  MeshCollider.setCylinder(entity, 1, 0)
  return entity
}

export function createCircle(entityFactory: NetworkManager, x: number, y: number, z: number, sync: boolean = true) {
  const entity = createCube(entityFactory, x, y, z, sync)
  MeshRenderer.setCylinder(entity, 1, 1)
  MeshCollider.setCylinder(entity, 1, 1)
  return entity
}

export function createCube(
  entityFactory: NetworkManager,
  x: number,
  y: number,
  z: number,
  sync: boolean = true
): Entity {
  const entity = entityFactory.addEntity(engine)
  // Used to track the cubes
  Cube.create(entity)

  Transform.create(entity, { position: { x, y, z } })
  // set how the cube looks and collides
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)

  sync && SyncComponents.create(entity, { componentIds: [Material.componentId] })

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

export function createCubes(networkManager: NetworkManager) {
  for (const [x, y, z] of [
    [44, 1, 26],
    [36, 2, 37],
    [20, 3, 40],
    [19, 1, 23],
    [31, 5, 8],
    [43, 4, 6],
    [37, 3, 24],
    [5, 8, 2]
  ]) {
    createCube(networkManager, x, y, z)
  }
}
