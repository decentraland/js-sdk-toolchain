import {
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  SyncEntity,
  PointerEvents,
  PointerEventType,
  InputAction,
  engine,
  inputSystem
} from '@dcl/ecs'
import { Color4 } from '@dcl/sdk/math'
import { NetworkEntityFactory } from '@dcl/sdk/network-transport/types'

// Cube factory
export const Cube = engine.defineComponent('cube', {})
export function createCube(entityFactory: NetworkEntityFactory, x: number, y: number, z: number): Entity {
  const entity = entityFactory.addEntity()
  // Used to track the cubes
  Cube.create(entity)

  Transform.create(entity, { position: { x, y, z } })
  // set how the cube looks and collides
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)
  Material.setPbrMaterial(entity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })

  SyncEntity.create(entity, { componentIds: [Material.componentId] })

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
