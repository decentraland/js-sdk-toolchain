import * as components from '../components'
import { PBTween, TweenLoop, TweenStateStatus } from '../components'
import { Entity, IEngine } from '../engine'
import { ReadWriteByteBuffer } from '../serialization/ByteBuffer'
import { dataCompare } from './crdt/utils'

export type TweenSystem = {
  tweenCompleted(entity: Entity): boolean
}

/**
 * Avoid creating multiple tween systems
 */
const cacheTween: Map<number, TweenSystem> = new Map()

/**
 * @public
 * @returns tween helper to be used on the scene
 */
export function createTweenSystem(engine: IEngine): TweenSystem {
  if (cacheTween.has(engine._id)) {
    return cacheTween.get(engine._id)!
  }
  const Tween = components.Tween(engine)
  const TweenState = components.TweenState(engine)
  const TweenSequence = components.TweenSequence(engine)

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
    /* istanbul ignore next */
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

    /* istanbul ignore next */
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
          Tween.createOrReplace(entity, backwardsTween(tween))
        } else if (tweenSequence.loop === TweenLoop.TL_RESTART) {
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

    /* istanbul ignore next */
    throw new Error('Invalid tween')
  }

  const tweenSystem: TweenSystem = {
    // This event is fired only once per tween
    tweenCompleted: isCompleted
  }

  cacheTween.set(engine._id, tweenSystem)
  return tweenSystem
}
