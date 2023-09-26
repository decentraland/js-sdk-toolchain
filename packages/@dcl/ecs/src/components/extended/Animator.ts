import { Entity, IEngine } from '../../engine'
import { LastWriteWinElementSetComponentDefinition } from '../../engine/component'
import { Animator } from '../generated/index.gen'
import { PBAnimationState, PBAnimator } from '../generated/pb/decentraland/sdk/components/animator.gen'

/**
 * @public
 */
export interface AnimatorComponentDefinitionExtended extends LastWriteWinElementSetComponentDefinition<PBAnimator> {
  /**
   * @public
   *
   * Get a `mutable` version of animator clip
   * @param entity - entity with Animator component
   * @param clipName - the field `clip` of the component
   * @returns the clip or fails if it isn't found
   */
  getClip(entity: Entity, clipName: string): PBAnimationState

  /**
   * @public
   *
   * Get a `mutable` version of animator clip
   * @param entity - entity with Animator component
   * @param clipName - the field `clip` of the component
   * @returns the clip or null if it isn't found
   */
  getClipOrNull(entity: Entity, clipName: string): PBAnimationState | null

  /**
   * @public
   *
   * Set playing=true the animation `$name`
   * @param entity - entity with Animator component
   * @param clipName - animation name
   * @param resetCursor - the animation starts at 0 or continues from the current cursor position
   * @returns true in successful playing, false if it doesn't find the Animator or clip
   */
  playSingleAnimation(entity: Entity, clipName: string, resetCursor?: boolean): boolean

  /**
   * @public
   *
   * Set playing=false all animations
   * @param entity - entity with Animator component
   * @param resetCursor - the animation stops at 0 or at the current cursor position
   * @returns true in successful playing, false if it doesn't find the Animator
   */
  stopAllAnimations(entity: Entity, resetCursor?: boolean): boolean
}

export function defineAnimatorComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): AnimatorComponentDefinitionExtended {
  const theComponent = Animator(engine)

  /**
   * @returns The tuple [animator, clip]
   */
  function getClipAndAnimator(entity: Entity, clipName: string): [PBAnimator | null, PBAnimationState | null] {
    const anim = theComponent.getMutableOrNull(entity)
    if (!anim) return [null, null]

    const state = anim.states.find((item) => item.clip === clipName)
    if (!state) return [anim, null]
    return [anim, state]
  }

  return {
    ...theComponent,
    getClipOrNull(entity: Entity, clipName: string): PBAnimationState | null {
      const [_, state] = getClipAndAnimator(entity, clipName)
      return state
    },
    getClip(entity: Entity, clipName: string): PBAnimationState {
      const [animator, state] = getClipAndAnimator(entity, clipName)

      if (!animator) {
        throw new Error(`There is no Animator found in the entity ${entity}`)
      }

      if (!state) {
        throw new Error(`The Animator component of ${entity} has no the state ${clipName}`)
      }

      return state
    },
    playSingleAnimation(entity: Entity, clipName: string, shouldReset: boolean = true): boolean {
      const [animator, state] = getClipAndAnimator(entity, clipName)
      if (!animator || !state) return false

      // Reset all other animations
      for (const state of animator.states) {
        state.playing = false
        state.shouldReset = true
      }

      state.playing = true
      state.shouldReset = shouldReset

      return true
    },

    stopAllAnimations(entity: Entity, resetCursor: boolean = true): boolean {
      // Get the mutable to modifying
      const animator = theComponent.getMutableOrNull(entity)
      if (!animator) return false

      // Reset all other animations
      for (const state of animator.states) {
        state.playing = false
        state.shouldReset = resetCursor
      }

      return true
    }
  }
}
