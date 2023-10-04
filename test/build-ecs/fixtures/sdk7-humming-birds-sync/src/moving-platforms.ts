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
  Entity,
  TweenLoop
} from '@dcl/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { engine } from '@dcl/sdk/ecs'
import { NetworkManager } from '@dcl/sdk/network-transport/types'
import { isServer } from '~system/EngineApi'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { dataCompare } from '@dcl/ecs/dist/systems/crdt/utils'

export function createMovingPlatforms(networkedEntityFactory: NetworkManager) {
  //// triggerable platform

  // only horizontal
  // const platform1 = networkedEntityFactory.addEntity(engine)
  // GltfContainer.create(platform1, {
  //   src: 'models/movingPlatform.glb'
  // })
  // Transform.create(platform1, {
  //   position: Vector3.create(2, 1.5, 8)
  // })
  // SyncComponents.create(platform1, { componentIds: [Tween.componentId] })

  // Tween.create(platform1, {
  //   mode: Tween.Mode.Move({ start: Vector3.create(2, 1.5, 6.5), end: Vector3.create(2, 1.5, 12) }),
  //   duration: 4000,
  //   tweenFunction: EasingFunction.TF_LINEAR
  // })

  // TweenSequence.create(platform1, { loop: TweenLoop.TL_RESTART, sequence: [] })

  // only vertical
  const parent = networkedEntityFactory.addEntity(engine)
  Transform.create(parent, { position: Vector3.create(4, 2.5, 14) })

  const platform2 = networkedEntityFactory.addEntity(engine)
  GltfContainer.create(platform2, {
    src: 'models/movingPlatform.glb'
  })

  Transform.create(platform2, { parent })
  SyncComponents.create(platform2, { componentIds: [Tween.componentId] })

  Tween.create(parent, {
    mode: Tween.Mode.Move({
      start: Vector3.create(3.5, 2.5, 14),
      end: Vector3.create(4, 4, 14)
    }),
    duration: 3000,
    tweenFunction: EasingFunction.TF_LINEAR
  })
  TweenSequence.create(parent, { sequence: [], loop: TweenLoop.TL_YOYO })

  Tween.create(platform2, {
    mode: Tween.Mode.Rotate({
      start: Quaternion.fromEulerDegrees(0, 0, 0),
      end: Quaternion.fromEulerDegrees(0, 180, 0)
    }),
    duration: 1000,
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
        duration: 1000,
        tweenFunction: EasingFunction.TF_LINEAR
      }
    ]
  })

  // const platform3 = networkedEntityFactory.addEntity(engine)
  // GltfContainer.create(platform3, {
  //   src: 'models/movingPlatform.glb'
  // })
  // Transform.create(platform3, {
  //   position: Vector3.create(14, 4, 12)
  // })
  // SyncComponents.create(platform3, { componentIds: [Tween.componentId] })
  // Tween.create(platform3, {
  //   mode: Tween.Mode.Move({ start: Vector3.create(14, 4, 12), end: Vector3.create(14, 4, 4) }),
  //   duration: 5000,
  //   tweenFunction: EasingFunction.TF_LINEAR
  // })
  // TweenSequence.create(platform3, { loop: TweenLoop.TL_YOYO, sequence: [] })

  // // //// path with many waypoints
  // const platform4 = networkedEntityFactory.addEntity(engine)
  // GltfContainer.create(platform4, {
  //   src: 'models/movingPlatform.glb'
  // })
  // Transform.create(platform4, {
  //   position: Vector3.create(6.5, 7, 4)
  // })
  // SyncComponents.create(platform4, { componentIds: [Tween.componentId, TweenSequence.componentId] })

  // const tween = Tween.create(platform4, {
  //   duration: 4000,
  //   tweenFunction: EasingFunction.TF_LINEAR,
  //   // { $case: 'move', move: { start, end }} //
  //   mode: Tween.Mode.Move({ start: Vector3.create(6.5, 7, 4), end: Vector3.create(6.5, 7, 12) })
  // })

  // TweenSequence.create(platform4, {
  //   sequence: [
  //     {
  //       ...tween,
  //       mode: Tween.Mode.Move({ start: Vector3.create(6.5, 7, 12), end: Vector3.create(6.5, 10.5, 12) })
  //     },
  //     {
  //       ...tween,
  //       mode: Tween.Mode.Move({ start: Vector3.create(6.5, 10.5, 12), end: Vector3.create(6.5, 10.5, 4) })
  //     },
  //     {
  //       ...tween,
  //       mode: Tween.Mode.Move({ start: Vector3.create(6.5, 10.5, 4), end: Vector3.create(6.5, 7, 4) })
  //     }
  //   ],
  //   loop: TweenLoop.TL_RESTART
  // })
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
    if (tweenSystem.tweenChanged(entity)) {
      console.log('[TestingSystem]: tween changed', entity)
    }
  }
}

const tweenSystem = TweenSystem()

function TweenSystem() {
  const cache = new Map<
    Entity,
    {
      // Used to detect new tweens for the same entity
      tween: Uint8Array
      // Avoid updaing again the tween in the case we receieve a network tween from other client
      frames: number
      // Trigger the isCompleted only once per tween
      completed: boolean
      // Tween has changed on this frame
      changed: boolean
    }
  >()

  function isCompleted(entity: Entity) {
    const tweenState = TweenState.getOrNull(entity)
    const tween = Tween.getOrNull(entity)
    const tweenCache = cache.get(entity)
    if (!tweenState || !tween) return false

    if (
      // Renderer notified that the tween is completed
      (tweenChanged(entity) || tweenState.state === TweenStateStatus.TS_COMPLETED) &&
      // Avoid sending isCompleted multiple times
      !tweenCache?.completed &&
      // Amount of frames needed to consider a tween completed
      (tweenCache?.frames ?? 0) > 2
    ) {
      return true
    }

    return false
  }

  function tweenChanged(entity: Entity) {
    const currentTween = Tween.getOrNull(entity)
    const prevTween = cache.get(entity)?.tween

    if ((currentTween && !prevTween) || (!currentTween && prevTween)) {
      return true
    }

    const currentBuff = new ReadWriteByteBuffer()
    Tween.schema.serialize(currentTween!, currentBuff)
    const equal = dataCompare(currentBuff.toBinary(), prevTween)

    return equal
  }

  const restartTweens: (() => void)[] = []
  // Logic for sequence tweens
  engine.addSystem(() => {
    for (const restart of restartTweens) {
      restart()
    }
    restartTweens.length = 0
    for (const [entity, tween] of engine.getEntitiesWith(Tween)) {
      if (tweenChanged(entity)) {
        const buffer = new ReadWriteByteBuffer()
        Tween.schema.serialize(tween, buffer)
        cache.set(entity, {
          tween: buffer.toBinary(),
          frames: 0,
          completed: false,
          changed: true
        })
        continue
      }
      const tweenCache = cache.get(entity)!
      tweenCache.frames += 1
      tweenCache.changed = false
      if (isCompleted(entity)) {
        // Reset tween frames.
        tweenCache.frames = 0
        // set the tween completed to avoid calling this again for the same tween
        tweenCache.completed = true

        const tweenSequence = TweenSequence.getOrNull(entity)
        if (!tweenSequence) continue
        const { sequence } = tweenSequence

        if (sequence && sequence.length) {
          const [nextTweenSequence, ...otherTweens] = sequence
          Tween.createOrReplace(entity, nextTweenSequence)
          const mutableTweenHelper = TweenSequence.getMutable(entity)
          mutableTweenHelper.sequence = otherTweens
          if (tweenSequence.loop === TweenLoop.TL_RESTART) {
            mutableTweenHelper.sequence.push(tween)
          }
        } else if (tweenSequence.loop === TweenLoop.TL_YOYO) {
          const newTween = backwardsTween(tween)
          Tween.createOrReplace(entity, newTween)
        } else if (tweenSequence.loop === TweenLoop.TL_RESTART) {
          // Tween.getMutable(entity).currentTime = (tween.currentTime || 0) + 0.00001
          Tween.deleteFrom(entity)
          cache.delete(entity)

          restartTweens.push(() => {
            Tween.createOrReplace(entity, tween)
          })
        }
      }
    }
  }, Number.NEGATIVE_INFINITY)

  function backwardsTween(tween: PBTween): PBTween {
    if (tween.mode?.$case === 'move' && tween.mode.move) {
      return {
        ...tween,
        mode: { ...tween.mode, move: { start: tween.mode.move.end, end: tween.mode.move.start } }
      }
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
    tweenChanged: (entity: Entity) => !!cache.get(entity)?.changed
  }
}
