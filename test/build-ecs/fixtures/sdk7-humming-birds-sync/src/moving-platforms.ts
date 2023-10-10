import {
  GltfContainer,
  Transform,
  SyncComponents,
  Tween,
  EasingFunction,
  TweenSequence,
  TweenLoop,
  tweenSystem
} from '@dcl/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
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
    mode: Tween.Mode.Move({ start: Vector3.create(2, 1.5, 6.5), end: Vector3.create(2, 1.5, 12) }),
    duration: 2000,
    tweenFunction: EasingFunction.TF_LINEAR
  })

  TweenSequence.create(platform1, { loop: TweenLoop.TL_YOYO, sequence: [] })

  // only vertical
  const parent = networkedEntityFactory.addEntity(engine)
  Transform.create(parent, { position: Vector3.create(3.5, 2.5, 14) })
  SyncComponents.create(parent, { componentIds: [Tween.componentId] })

  const platform2 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform2, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform2, { parent })
  SyncComponents.create(platform2, { componentIds: [Tween.componentId, TweenSequence.componentId] })

  Tween.create(parent, {
    mode: Tween.Mode.Move({
      start: Vector3.create(3.5, 2.5, 14),
      end: Vector3.create(4, 4, 14)
    }),
    duration: 1000,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenSequence.create(parent, { sequence: [], loop: TweenLoop.TL_YOYO })

  Tween.create(platform2, {
    mode: Tween.Mode.Rotate({
      start: Quaternion.fromEulerDegrees(0, 0, 0),
      end: Quaternion.fromEulerDegrees(0, 170, 0)
    }),
    duration: 700,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenSequence.create(platform2, {
    loop: TweenLoop.TL_RESTART,
    sequence: [
      {
        mode: Tween.Mode.Rotate({
          start: Quaternion.fromEulerDegrees(0, 180, 0),
          end: Quaternion.fromEulerDegrees(0, 360, 0)
        }),
        duration: 700,
        tweenFunction: EasingFunction.TF_LINEAR
      }
    ]
  })

  const platform3 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform3, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform3, {
    position: Vector3.create(14, 4, 12)
  })
  SyncComponents.create(platform3, { componentIds: [Tween.componentId] })
  Tween.create(platform3, {
    mode: Tween.Mode.Move({ start: Vector3.create(14, 4, 12), end: Vector3.create(14, 4, 4) }),
    duration: 3000,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenSequence.create(platform3, { loop: TweenLoop.TL_YOYO, sequence: [] })

  // //// path with many waypoints
  const platform4 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform4, {
    src: 'models/movingPlatform.glb'
  })
  Transform.create(platform4, {
    position: Vector3.create(6.5, 7, 4)
  })
  SyncComponents.create(platform4, { componentIds: [Tween.componentId, TweenSequence.componentId] })

  Tween.create(platform4, {
    duration: 4000,
    tweenFunction: EasingFunction.TF_LINEAR,
    currentTime: 0,
    playing: true,
    mode: Tween.Mode.Move({ start: Vector3.create(6.5, 7, 4), end: Vector3.create(6.5, 7, 12) })
  })

  TweenSequence.create(platform4, {
    sequence: [
      {
        duration: 2000,
        tweenFunction: EasingFunction.TF_EASEBOUNCE,
        mode: Tween.Mode.Move({ start: Vector3.create(6.5, 7, 12), end: Vector3.create(6.5, 10.5, 12) })
      },
      {
        duration: 3000,
        tweenFunction: EasingFunction.TF_EASEBOUNCE,
        mode: Tween.Mode.Move({ start: Vector3.create(6.5, 10.5, 12), end: Vector3.create(6.5, 10.5, 4) })
      },
      {
        duration: 3000,
        tweenFunction: EasingFunction.TF_LINEAR,
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
      console.log('[TestingSystem]: tween completed', entity)
    }
  }
}
