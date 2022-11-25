import { ComponentDefinition, Entity, IEngine, ISchema } from '../../engine'
import {
  PBAnimationState,
  PBAnimator
} from '../generated/pb/decentraland/sdk/components/animator.gen'
import * as AnimatorSchema from './../generated/Animator.gen'

/**
 * @public
 */
export interface AnimatorComponentDefinition
  extends ComponentDefinition<ISchema<PBAnimator>, PBAnimator> {
  /**
   * @public
   *
   * Get a `mutable` version of animator clip
   * @param entity - entity with Animator component
   * @param name - the field `name` of the component
   * @returns the clip or fails if it isn't found
   */
  getClip(entity: Entity, name: string): PBAnimationState

  /**
   * @public
   *
   * Get a `mutable` version of animator clip
   * @param entity - entity with Animator component
   * @param name - the field `name` of the component
   * @returns the clip or null if it isn't found
   */
  getClipOrNull(entity: Entity, name: string): PBAnimationState | null

  /**
   * @public
   *
   * Set playing=true the animation `$name`
   * @param entity - entity with Animator component
   * @param name - animation name
   * @param resetCursor - the animation starts at 0 or continues from the current cursor position
   * @returns true in successful playing, false if it doesn't find the Animator or clip
   */
  playSingleAnimation(
    entity: Entity,
    name: string,
    resetCursor?: boolean
  ): boolean

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
  engine: Pick<IEngine, 'getComponent'>
): AnimatorComponentDefinition {
  const Animator: ComponentDefinition<
    ISchema<PBAnimator>,
    PBAnimator
  > = engine.getComponent<typeof AnimatorSchema.AnimatorSchema>(
    AnimatorSchema.COMPONENT_ID
  )

  /**
   * @returns The tuple [animator, clip]
   */
  function getClipAndAnimator(
    entity: Entity,
    name: string
  ): [PBAnimator | null, PBAnimationState | null] {
    const anim = Animator.getMutableOrNull(entity)
    if (!anim) return [null, null]

    const state = anim.states.find(
      (item) => item.name === name || item.clip === name
    )
    if (!state) return [anim, null]
    return [anim, state]
  }

  return {
    ...Animator,
    getClipOrNull(entity: Entity, name: string): PBAnimationState | null {
      const [_, state] = getClipAndAnimator(entity, name)
      return state
    },
    getClip(entity: Entity, name: string): PBAnimationState {
      const [animator, state] = getClipAndAnimator(entity, name)

      if (!animator) {
        throw new Error(`There is no Animator found in the entity ${entity}`)
      }

      if (!state) {
        throw new Error(
          `The Animator component of ${entity} has no the state ${name}`
        )
      }

      return state
    },
    playSingleAnimation(
      entity: Entity,
      name: string,
      shouldReset: boolean = true
    ): boolean {
      const [animator, state] = getClipAndAnimator(entity, name)
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
      const animator = Animator.getMutableOrNull(entity)
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
