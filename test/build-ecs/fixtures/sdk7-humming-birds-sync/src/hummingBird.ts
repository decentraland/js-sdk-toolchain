import {
  Animator,
  ColliderLayer,
  Entity,
  GltfContainer,
  InputAction,
  MeshCollider,
  PointerEventType,
  PointerEvents,
  SyncEntity,
  Transform,
  engine,
  inputSystem
} from '@dcl/sdk/ecs'
import { Quaternion } from '@dcl/sdk/math'
import * as utils from '@dcl-sdk/utils'
import { NetworkEntityFactory } from '@dcl/sdk/network-transport/types'

export const Bird = engine.defineComponent('bird', {})

engine.addSystem(() => {
  for (const [entity] of engine.getEntitiesWith(Bird, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
      engine.removeEntity(entity)
    }
  }
})

export function createHummingBird(engine: NetworkEntityFactory) {
  const bird = engine.addEntity()
  Bird.create(bird)
  SyncEntity.create(bird, { componentIds: [Transform.componentId, Animator.componentId] })
  Transform.create(bird, {
    position: { x: 13, y: 3.5, z: 5 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 0.2, y: 0.2, z: 0.2 }
  })

  GltfContainer.create(bird, {
    src: 'models/hummingbird.glb',
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: ColliderLayer.CL_POINTER
  })

  MeshCollider.setSphere(bird, ColliderLayer.CL_POINTER)

  Animator.create(bird, {
    states: [
      {
        clip: 'fly',
        loop: true,
        playing: true,
        shouldReset: false,
        speed: 2,
        name: 'fly'
      },
      {
        clip: 'look',
        loop: false,
        playing: false,
        shouldReset: false,
        name: 'look'
      },
      {
        clip: 'shake',
        loop: false,
        playing: false,
        shouldReset: false,
        name: 'shake'
      }
    ]
  })

  PointerEvents.create(bird, {
    pointerEvents: [
      { eventType: PointerEventType.PET_DOWN, eventInfo: { button: InputAction.IA_POINTER, hoverText: 'KILL' } }
    ]
  })

  // fly pattern
  utils.timers.setInterval(() => {
    const birdTransform = Transform.getMutableOrNull(bird)
    if (!birdTransform) return

    // next target
    const nextPos = {
      x: Math.random() * 12 + 2,
      y: Math.random() * 3 + 1,
      z: Math.random() * 12 + 2
    }

    const nextRot = Quaternion.fromLookAt(birdTransform.position, nextPos)

    // face new pos
    utils.tweens.startRotation(bird, birdTransform.rotation, nextRot, 0.3, utils.InterpolationType.EASEINSINE)

    // move to next pos (after rotating)
    utils.timers.setTimeout(
      () => {
        utils.tweens.startTranslation(bird, birdTransform.position, nextPos, 2, utils.InterpolationType.EASEINEXPO)
      },
      300 // after rotation is over
    )

    // randomly play head animation
    utils.timers.setTimeout(
      () => randomHeadMovement(bird),
      2500 // after rotation and translation + pause
    )
  }, 4000) // loop every 4 seconds
}

// Randomly determine if any head moving animations are played
export function randomHeadMovement(bird: Entity) {
  const anim = Math.random()
  if (anim < 0.2) {
    const look = Animator.getClipOrNull(bird, 'look')
    if (!look) return
    look.playing = true
  } else if (anim > 0.8) {
    const shake = Animator.getClipOrNull(bird, 'shake')
    if (!shake) return
    shake.playing = true
  }
}
