import {
  GltfContainer,
  Transform,
  SyncComponents,
  Tween,
  EasingFunction,
  TweenState,
  TweenStateStatus,
  PBTween,
  TweenSequence,
  Entity
} from '@dcl/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { engine } from '@dcl/sdk/ecs'
import { NetworkManager } from '@dcl/sdk/network-transport/types'
import { isServer } from '~system/EngineApi'

export function createMovingPlatforms(networkedEntityFactory: NetworkManager) {
  //// triggerable platform

  // only horizontal
  const platform1 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform1, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform1, {
    position: Vector3.create(2, 1.5, 8)
  })
  SyncComponents.create(platform1, { componentIds: [Tween.componentId] })
  Tween.create(platform1, {
    mode: { $case: 'move', move: { start: Vector3.create(2, 1.5, 6.5), end: Vector3.create(2, 1.5, 12) } },
    duration: 4000,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenSequence.create(platform1, { loop: true, sequence: [] })

  // // only vertical
  const platform2 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform2, {
    src: 'models/movingPlatform.glb'
  })

  Transform.create(platform2, { position: Vector3.create(4, 1.5, 14) })
  SyncComponents.create(platform2, { componentIds: [Tween.componentId] })
  Tween.create(platform2, {
    mode: { $case: 'move', move: { start: Vector3.create(4, 1.5, 14), end: Vector3.create(4, 4, 14) } },
    duration: 4000,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenSequence.create(platform2, { loop: true, sequence: [] })

  const platform3 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform3, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform3, {
    position: Vector3.create(14, 4, 12)
  })
  SyncComponents.create(platform3, { componentIds: [Tween.componentId] })
  Tween.create(platform3, {
    mode: { $case: 'move', move: { start: Vector3.create(14, 4, 12), end: Vector3.create(14, 4, 4) } },
    duration: 5000,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenSequence.create(platform3, { loop: true, sequence: [] })

  // //// path with many waypoints
  const platform4 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform4, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform4, {
    position: Vector3.create(6.5, 7, 4)
  })
  SyncComponents.create(platform4, { componentIds: [Tween.componentId, TweenSequence.componentId] })

  const tween = Tween.create(platform4, {
    duration: 4000,
    tweenFunction: EasingFunction.TF_LINEAR,
    mode: { $case: 'move', move: { start: Vector3.create(6.5, 7, 4), end: Vector3.create(6.5, 7, 12) } }
  })

  TweenSequence.create(platform4, {
    sequence: [
      {
        ...tween,
        mode: { $case: 'move', move: { start: Vector3.create(6.5, 7, 12), end: Vector3.create(6.5, 10.5, 12) } }
      },
      {
        ...tween,
        mode: { $case: 'move', move: { start: Vector3.create(6.5, 10.5, 12), end: Vector3.create(6.5, 10.5, 4) } }
      },
      {
        ...tween,
        mode: { $case: 'move', move: { start: Vector3.create(6.5, 10.5, 4), end: Vector3.create(6.5, 7, 4) } }
      }
    ],
    loop: true
  })
}

void isServer({}).then(({ isServer }) => {
  if (isServer) return
  engine.addSystem(testingSystem)
})

function testingSystem() {
  for (const [entity, _tween] of engine.getEntitiesWith(Tween)) {
    if (tweenUtils.tweenCompleted(entity)) {
      console.log('[TestingSystem]: tween completed', entity)
    }
    if (tweenUtils.tweenChanged(entity)) {
      console.log('[TestingSystem]: tween changed', entity)
    }
  }
}

// 2- Helpers TweenMove, TweenRotate
// 3- Perpetual motion
const tweenUtils = TweenUtils()

function TweenUtils() {
  // Used to detect new tweens for the same entity and reset the frames & completed values
  const cacheTween = new Map<Entity, PBTween>()

  // Used to avoid updaing again the tween in the case we receieve a network tween from other client
  const tweenFrames = new Map<Entity, number>()

  // Trigger the isCompleted only once per tween
  const tweenCompleted = new Map<Entity, boolean>()

  function isCompleted(entity: Entity) {
    const tweenState = TweenState.getOrNull(entity)
    const tween = Tween.getOrNull(entity)

    if (!tweenState || !tween) return false

    if (
      // Renderer notified that the tween is completed
      (tweenChanged(entity) || tweenState.state === TweenStateStatus.TS_COMPLETED) &&
      // Avoid sending isCompleted multiple times
      !tweenCompleted.get(entity) &&
      // Amount of frames needed to consider a tween completed
      tweenFrames.get(entity)! > 2
    ) {
      return true
    }

    return false
  }

  function tweenChanged(entity: Entity) {
    const currentTween = Tween.getOrNull(entity)
    const prevTween = cacheTween.get(entity)

    // Maybe store the buffer and compare buffers ?
    return JSON.stringify(prevTween?.mode) !== JSON.stringify(currentTween?.mode)
  }

  // Logic for sequence tweens
  engine.addSystem(() => {
    for (const [entity, tween] of engine.getEntitiesWith(Tween)) {
      tweenFrames.set(entity, (tweenFrames.get(entity) ?? 0) + 1)
      if (tweenChanged(entity)) {
        // Maybe store de buffer ?
        cacheTween.set(entity, JSON.parse(JSON.stringify(tween)))
        tweenCompleted.set(entity, false)
        tweenFrames.set(entity, 0)
        continue
      }

      if (isCompleted(entity)) {
        // Reset tween frames.
        tweenFrames.set(entity, 0)
        // set the tween completed to avoid calling this again for the same tween
        tweenCompleted.set(entity, true)

        const tweenSequence = TweenSequence.getOrNull(entity)
        if (!tweenSequence) continue
        const { sequence } = tweenSequence

        if (sequence && sequence.length) {
          const [nextTweenSequence, ...otherTweens] = sequence
          Tween.createOrReplace(entity, nextTweenSequence)
          const mutableTweenHelper = TweenSequence.getMutable(entity)
          mutableTweenHelper.sequence = otherTweens
          if (tweenSequence.loop) {
            mutableTweenHelper.sequence.push(tween)
          }
        } else if (tweenSequence.loop) {
          const newTween = backwardsTween(tween)
          Tween.createOrReplace(entity, newTween)
        }
      }
    }
  }, Number.NEGATIVE_INFINITY)

  function backwardsTween(tween: PBTween): PBTween {
    if (tween.mode?.$case === 'move' && tween.mode.move) {
      return { ...tween, mode: { ...tween.mode, move: { start: tween.mode.move.end, end: tween.mode.move.start } } }
    }
    if (tween.mode?.$case === 'rotate' && tween.mode.rotate) {
      return {
        ...tween,
        mode: { ...tween.mode, rotate: { start: tween.mode.rotate.end, end: tween.mode.rotate.start } }
      }
    }
    if (tween.mode?.$case === 'scale' && tween.mode.scale) {
      return { ...tween, mode: { ...tween.mode, scale: { start: tween.mode.scale.end, end: tween.mode.scale.start } } }
    }
    throw new Error('Invalid tween')
  }

  return {
    // This event is fired only once per tween
    tweenCompleted: isCompleted,
    tweenChanged
  }
}
