import {
  Animator,
  ColliderLayer,
  Entity,
  GltfContainer,
  InputAction,
  MeshCollider,
  NetworkEntity,
  PointerEventType,
  PointerEvents,
  Schemas,
  Transform,
  VisibilityComponent,
  engine,
  inputSystem
} from '@dcl/sdk/ecs'
import { myProfile, syncEntity } from '@dcl/sdk//network'
import { Quaternion } from '@dcl/sdk/math'
import * as utils from '@dcl-sdk/utils'

export const Bird = engine.defineComponent('bird', {})

// TODO: this BirdKilled should be added by the server but its not part of this POC
export const BirdKilled = engine.defineComponent('bird-killed', { userId: Schemas.String })

export function createHummingBird() {
  const bird = engine.addEntity()
  syncEntity(bird, [
    Transform.componentId,
    Animator.componentId,
    VisibilityComponent.componentId,
    BirdKilled.componentId
  ])
  Bird.create(bird)
  VisibilityComponent.create(bird, { visible: true })
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
        speed: 2
      },
      {
        clip: 'look',
        loop: false,
        playing: false,
        shouldReset: false
      },
      {
        clip: 'shake',
        loop: false,
        playing: false,
        shouldReset: false
      }
    ]
  })

  PointerEvents.create(bird, {
    pointerEvents: [
      { eventType: PointerEventType.PET_DOWN, eventInfo: { button: InputAction.IA_POINTER, hoverText: 'KILL' } }
    ]
  })
}

// System to shoot birds
export function shootBirds(userId: string) {
  return function () {
    for (const [entity, _bird, visibleComponent] of engine.getEntitiesWith(Bird, VisibilityComponent, PointerEvents)) {
      if (
        inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity) &&
        visibleComponent.visible &&
        !BirdKilled.has(entity)
      ) {
        VisibilityComponent.getMutable(entity).visible = false
        BirdKilled.create(entity, { userId })
      }
    }
  }
}

// System to move birds
let birdsTime = 0
export function moveHummingBirds(dt: number) {
  birdsTime += dt
  if (birdsTime <= 4) return
  birdsTime = 0

  for (const [birdEntity, _bird, visibleComponent, networkEntity] of engine.getEntitiesWith(
    Bird,
    VisibilityComponent,
    NetworkEntity
  )) {
    if (!visibleComponent.visible) continue
    if (networkEntity?.networkId !== myProfile.networkId) continue

    const birdTransform = Transform.getMutableOrNull(birdEntity)
    if (!birdTransform) continue

    // next target
    const nextPos = {
      x: Math.random() * 40 + 2,
      y: Math.random() * 3 + 1,
      z: Math.random() * 40 + 2
    }

    const nextRot = Quaternion.fromLookAt(birdTransform.position, nextPos)

    // face new pos
    utils.tweens.startRotation(birdEntity, birdTransform.rotation, nextRot, 0.3, utils.InterpolationType.EASEINSINE)

    // move to next pos (after rotating)
    utils.timers.setTimeout(
      () => {
        utils.tweens.startTranslation(
          birdEntity,
          birdTransform.position,
          nextPos,
          3.7,
          utils.InterpolationType.EASEINEXPO
        )
      },
      300 // after rotation is over
    )

    // randomly play head animation
    utils.timers.setTimeout(
      () => randomHeadMovement(birdEntity),
      2500 // after rotation and translation + pause
    )
  }
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
