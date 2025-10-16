import * as components from '../components'
import { TweenStateStatus } from '../components'
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

  const tweenSystem: TweenSystem = {
    // This event is fired only once per tween
    tweenCompleted: isCompleted
  }

  cacheTween.set(engine._id, tweenSystem)
  return tweenSystem
}
