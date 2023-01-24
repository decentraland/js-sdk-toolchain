import {
  Entity,
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  PointerHoverFeedback,
  PointerEventType,
  InputAction
} from '@dcl/sdk/ecs'

// Cube factory
export function createCube(x: number, y: number, z: number, spawner = true): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })

  // set how the cube looks and collides
  MeshRenderer.setBox(meshEntity)
  MeshCollider.setBox(meshEntity)

  // if it is a spawner, then we set the pointer hover feedback
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
