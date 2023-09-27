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

const cacheTween = new Map<Entity, PBTween>()
const tweenFrames = new Map<Entity, number>()
// Tween Helpers
engine.addSystem(() => {
  for (const [entity, tweenSequence, tween, tweenState] of engine.getEntitiesWith(TweenSequence, Tween, TweenState)) {
    const prevTween = cacheTween.get(entity)
    const sameTween = JSON.stringify(prevTween) === JSON.stringify(tween)
    const frame = tweenFrames.get(entity) || tweenFrames.set(entity, 0).get(entity)!
    tweenFrames.set(entity, frame + 1)
    if (!sameTween) {
      cacheTween.set(entity, tween)
      tweenFrames.set(entity, 0)
      continue // 0,99
    }
    if (
      sameTween &&
      tweenState.state === TweenStateStatus.TS_COMPLETED &&
      // TODO: hackishhhhhhh for networking (avoid updating again the tween when we recieved a message and ours is about to finish too)
      tweenFrames.get(entity)! > 10
    ) {
      tweenFrames.set(entity, 0)
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
})

function backwardsTween(tween: PBTween): PBTween {
  if (tween.mode?.$case === 'move' && tween.mode.move) {
    return { ...tween, mode: { ...tween.mode, move: { start: tween.mode.move.end, end: tween.mode.move.start } } }
  }
  if (tween.mode?.$case === 'rotate' && tween.mode.rotate) {
    return { ...tween, mode: { ...tween.mode, rotate: { start: tween.mode.rotate.end, end: tween.mode.rotate.start } } }
  }
  if (tween.mode?.$case === 'scale' && tween.mode.scale) {
    return { ...tween, mode: { ...tween.mode, scale: { start: tween.mode.scale.end, end: tween.mode.scale.start } } }
  }
  throw new Error('Invalid tween')
}
