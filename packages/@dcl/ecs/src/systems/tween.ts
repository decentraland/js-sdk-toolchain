import * as components from '../components'
import { PBTween, TweenLoop, TweenStateStatus } from '../components'
import { Entity, IEngine } from '../engine'
import { ReadWriteByteBuffer } from '../serialization/ByteBuffer'
import { dataCompare } from './crdt/utils'
import { getGlobal } from '../runtime/globals'
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
      // Trigger the isCompleted only once per tween
      completed: boolean
      // Tween has changed on this frame
      changed: boolean
      // True right after this tween was (re)introduced (created, replaced, or advanced by the
      // sequence/YOYO logic below). Cleared the first time the renderer reports a state other than
      // TS_COMPLETED (or reports no state at all) for it. While true, a TS_COMPLETED reading is
      // assumed to be a stale leftover from the tween this one replaced - the renderer's PUT for
      // the new tween's own state hasn't round-tripped back yet - and is never trusted as its
      // completion.
      awaitingFreshState: boolean
    }
  >()
  function isCompleted(entity: Entity) {
    const tween = Tween.getOrNull(entity)
    const tweenCache = cache.get(entity)
    if (!tween || !tweenCache) return false

    // A tween that was just replaced (this frame) is never completed: the cache-maintenance
    // system below hasn't caught up with the new definition yet, so `tweenCache` still describes
    // the tween that was just replaced, not the current one.
    if (tweenChanged(entity)) return false

    const tweenState = TweenState.getOrNull(entity)
    if (!tweenState || tweenState.state !== TweenStateStatus.TS_COMPLETED) {
      // The renderer isn't (or is no longer) reporting completion for this tween, so any earlier
      // TS_COMPLETED reading is confirmed stale: trust the next TS_COMPLETED we see for it.
      tweenCache.awaitingFreshState = false
      return false
    }

    // From here, the renderer reports TS_COMPLETED for the current tween definition.
    if (
      // Still the stale completion of the tween this one replaced
      tweenCache.awaitingFreshState ||
      // Avoid sending isCompleted multiple times
      tweenCache.completed
    ) {
      return false
    }
    return true
  }
  function tweenChanged(entity: Entity) {
    const currentTween = Tween.getOrNull(entity)
    const prevTween = cache.get(entity)?.tween
    /* istanbul ignore next */
    if ((currentTween && !prevTween) || (!currentTween && prevTween)) {
      return true
    }
    if (!currentTween || !prevTween) return false
    const currentBuff = new ReadWriteByteBuffer()
    Tween.schema.serialize(currentTween, currentBuff)
    const compareResult = dataCompare(currentBuff.toBinary(), prevTween)
    return compareResult !== 0
  }

  // System to manage cache (needed for tweenSystem.tweenCompleted() to work)
  engine.addSystem(() => {
    for (const [entity, tween] of engine.getEntitiesWith(Tween)) {
      if (tweenChanged(entity)) {
        const buffer = new ReadWriteByteBuffer()
        Tween.schema.serialize(tween, buffer)
        cache.set(entity, {
          tween: buffer.toBinary(),
          completed: false,
          changed: true,
          awaitingFreshState: true
        })
        continue
      }
      const tweenCache = cache.get(entity)
      if (tweenCache) {
        tweenCache.changed = false
        if (isCompleted(entity)) {
          // set the tween completed to avoid calling this again for the same tween
          tweenCache.completed = true
        }
      }
    }
  }, Number.NEGATIVE_INFINITY)

  function initializeTweenSequenceSystem() {
    const restartTweens: (() => void)[] = []
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
        return {
          ...tween,
          mode: { ...tween.mode, scale: { start: tween.mode.scale.end, end: tween.mode.scale.start } }
        }
      }
      if (tween.mode?.$case === 'textureMove' && tween.mode.textureMove) {
        return {
          ...tween,
          mode: { ...tween.mode, textureMove: { start: tween.mode.textureMove.end, end: tween.mode.textureMove.start } }
        }
      }
      /* istanbul ignore next */
      throw new Error('Invalid tween')
    }

    // Logic for sequence tweens
    engine.addSystem(() => {
      for (const restart of restartTweens) {
        restart()
      }
      restartTweens.length = 0
      for (const [entity, tween] of engine.getEntitiesWith(Tween)) {
        const tweenCache = cache.get(entity)
        if (!tweenCache) continue

        // Only process tween sequences if the tween is completed
        if (tweenCache.completed) {
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
            // Reset completed flag for the next tween in sequence
            // Mark as changed so the cache system will detect the change and reset the cache properly
            tweenCache.completed = false
            tweenCache.changed = true
            // The renderer still hasn't reported on this replacement tween; don't trust a
            // TS_COMPLETED reading until it reports something else for it first.
            tweenCache.awaitingFreshState = true
          } else if (tweenSequence.loop === TweenLoop.TL_YOYO) {
            Tween.createOrReplace(entity, backwardsTween(tween))
            // Reset completed flag for the backwards tween
            // Mark as changed so the cache system will detect the change and reset the cache properly
            tweenCache.completed = false
            tweenCache.changed = true
            // The renderer still hasn't reported on this replacement tween; don't trust a
            // TS_COMPLETED reading until it reports something else for it first.
            tweenCache.awaitingFreshState = true
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
  }

  // Some Explorers may not inject the flag and TweenSequence logic must be enabled in that case
  const enableTweenSequenceLogic = getGlobal<boolean>('ENABLE_SDK_TWEEN_SEQUENCE')
  if (enableTweenSequenceLogic !== false) initializeTweenSequenceSystem()

  const tweenSystem: TweenSystem = {
    // This event is fired only once per tween
    tweenCompleted: isCompleted
  }
  cacheTween.set(engine._id, tweenSystem)
  return tweenSystem
}
