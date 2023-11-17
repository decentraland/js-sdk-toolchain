import {
  engine,
  GltfContainer,
  Transform,
  Tween,
  EasingFunction,
  TweenSequence,
  TweenLoop,
  tweenSystem
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { isServer } from '~system/EngineApi'
import { syncEntity } from '@dcl/sdk/network'
import { SyncEntities } from './sync-enum'

export function createMovingPlatforms() {
  // triggerable platform
  // only horizontal
  const platform1 = engine.addEntity()
  GltfContainer.create(platform1, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform1, {
    position: Vector3.create(2, 1.5, 8)
  })
  syncEntity(platform1, [Tween.componentId], SyncEntities.PLATFORM_1)

  Tween.create(platform1, {
    mode: Tween.Mode.Move({ start: Vector3.create(2, 1.5, 6.5), end: Vector3.create(2, 1.5, 12) }),
    duration: 2000,
    easingFunction: EasingFunction.EF_LINEAR
  })

  TweenSequence.create(platform1, { loop: TweenLoop.TL_YOYO, sequence: [] })

  // only vertical
  // const parent = engine.addEntity()
  // Transform.create(parent // 512, { position: Vector3.create(3.5, 2.5, 14) })
  // syncEntity(parent, [Tween.componentId], SyncEntities.PLATFORM_2_PARENT)

  const platform2 = engine.addEntity()
  GltfContainer.create(platform2, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform2, { position: Vector3.create(3.5, 2.5, 14) })
  syncEntity(platform2, [Tween.componentId, TweenSequence.componentId], SyncEntities.PLATFORM_2)
  Tween.create(platform2, {
    mode: Tween.Mode.Move({
      start: Vector3.create(3.5, 2.5, 14),
      end: Vector3.create(4, 4, 14)
    }),
    duration: 1000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(platform2, { sequence: [], loop: TweenLoop.TL_YOYO })
  const platform3 = engine.addEntity()
  GltfContainer.create(platform3, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform3, {
    position: Vector3.create(14, 4, 12)
  })
  syncEntity(platform3, [Tween.componentId], SyncEntities.PLATFORM_3)

  Tween.create(platform3, {
    mode: Tween.Mode.Move({ start: Vector3.create(14, 4, 12), end: Vector3.create(14, 4, 4) }),
    duration: 3000,
    easingFunction: EasingFunction.EF_LINEAR
  })
  TweenSequence.create(platform3, { loop: TweenLoop.TL_YOYO, sequence: [] })

  // //// path with many waypoints
  const platform4 = engine.addEntity()
  GltfContainer.create(platform4, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform4, {
    position: Vector3.create(6.5, 7, 4)
  })
  syncEntity(platform4, [Tween.componentId, TweenSequence.componentId], SyncEntities.PLATFORM_4)

  Tween.create(platform4, {
    duration: 4000,
    easingFunction: EasingFunction.EF_LINEAR,
    currentTime: 0,
    playing: true,
    mode: Tween.Mode.Move({ start: Vector3.create(6.5, 7, 4), end: Vector3.create(6.5, 7, 12) })
  })

  TweenSequence.create(platform4, {
    sequence: [
      {
        duration: 2000,
        easingFunction: EasingFunction.EF_EASEBOUNCE,
        mode: Tween.Mode.Move({ start: Vector3.create(6.5, 7, 12), end: Vector3.create(6.5, 10.5, 12) })
      },
      {
        duration: 3000,
        easingFunction: EasingFunction.EF_EASEBOUNCE,
        mode: Tween.Mode.Move({ start: Vector3.create(6.5, 10.5, 12), end: Vector3.create(6.5, 10.5, 4) })
      },
      {
        duration: 3000,
        easingFunction: EasingFunction.EF_LINEAR,
        mode: Tween.Mode.Move({ start: Vector3.create(6.5, 10.5, 4), end: Vector3.create(6.5, 7, 4) })
      }
    ],
    loop: TweenLoop.TL_RESTART
  })
}

void isServer({}).then(({ isServer }) => {
  if (isServer) return
  engine.addSystem(testingSystem)
})

function testingSystem() {
  for (const [entity, _tween] of engine.getEntitiesWith(Tween)) {
    if (tweenSystem.tweenCompleted(entity)) {
      // console.log('[TestingSystem]: tween completed', entity)
    }
  }
}
