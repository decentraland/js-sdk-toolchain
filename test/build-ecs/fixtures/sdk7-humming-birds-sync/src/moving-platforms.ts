import {
  GltfContainer,
  Transform,
  SyncComponents,
  Tween,
  EasingFunction,
  TweenState,
  TweenStateStatus,
  PBTween,
  Entity,
  Schemas
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
  SyncComponents.create(platform1, { componentIds: [Tween.componentId, TweenHelper.componentId] })
  Tween.create(platform1, {
    mode: { $case: 'move', move: { start: Vector3.create(2, 1.5, 6.5), end: Vector3.create(2, 1.5, 12) } },
    duration: 4000,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenHelper.create(platform1, { loop: true })

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
  TweenHelper.create(platform2, { loop: true })

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
  TweenHelper.create(platform3, { loop: true })

  // //// path with many waypoints
  const platform4 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform4, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform4, {
    position: Vector3.create(6.5, 7, 4)
  })
  SyncComponents.create(platform4, { componentIds: [Tween.componentId, TweenHelper.componentId] })
  const tween = Tween.create(platform4, {
    duration: 4000,
    tweenFunction: EasingFunction.TF_LINEAR,
    mode: { $case: 'move', move: { start: Vector3.create(6.5, 7, 4), end: Vector3.create(6.5, 7, 12) } }
  })

  TweenHelper.create(platform4, {
    sequenceTweens: [
      { ...tween, move: { start: Vector3.create(6.5, 7, 12), end: Vector3.create(6.5, 10.5, 12) } },
      { ...tween, move: { start: Vector3.create(6.5, 10.5, 12), end: Vector3.create(6.5, 10.5, 4) } },
      { ...tween, move: { start: Vector3.create(6.5, 10.5, 4), end: Vector3.create(6.5, 7, 4) } }
    ],
    loop: true
  })
}

const TweenSchema = Schemas.Map({
  move: Schemas.Optional(Schemas.Map({ start: Schemas.Vector3, end: Schemas.Vector3 })),
  duration: Schemas.Number,
  tweenFunction: Schemas.Number
})

export const TweenHelper = engine.defineComponent('chore:tween-helper', {
  // Tween is a protobuf component
  sequenceTweens: Schemas.Optional(Schemas.Array(TweenSchema)),
  loop: Schemas.Optional(Schemas.Boolean)
})

const cacheTween = new Map<Entity, PBTween>()
const tweenFrames = new Map<Entity, number>()
// Tween Helpers
engine.addSystem(() => {
  for (const [entity, tweenHelper, tween, tweenState] of engine.getEntitiesWith(TweenHelper, Tween, TweenState)) {
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
      tween.mode?.$case === 'move' &&
      // TODO: hackishhhhhhh
      tweenFrames.get(entity)! > 10
    ) {
      tweenFrames.set(entity, 0)
      const { sequenceTweens } = tweenHelper
      if (sequenceTweens && sequenceTweens.length) {
        const [nextTweenSequence, ...otherTweens] = sequenceTweens
        const nextTween: PBTween = {
          duration: nextTweenSequence.duration,
          tweenFunction: nextTweenSequence.tweenFunction,
          mode: { $case: 'move', move: tween.mode.move! }
        }
        Tween.createOrReplace(entity, nextTween)
        const mutableTweenHelper = TweenHelper.getMutable(entity)
        mutableTweenHelper.sequenceTweens = otherTweens
        if (tweenHelper.loop) {
          mutableTweenHelper.sequenceTweens.push(tween)
        }
      } else if (tweenHelper.loop) {
        const start = tween.mode.move.end!
        const end = tween.mode.move.start!
        const tweenMutable = Tween.getMutable(entity)
        tweenMutable.mode = { $case: 'move', move: { start, end } }
      }
    }
  }
})
