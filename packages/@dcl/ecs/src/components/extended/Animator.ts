import { ComponentDefinition, Entity, PreEngine } from '../../engine'
import { PBAnimationState } from '../generated/pb/decentraland/sdk/components/animator.gen'
import * as AnimatorSchema from './../generated/Animator.gen'

/**
 * @public
 */
export interface AnimatorComponentDefinition extends ComponentDefinition {
  /**
   * @public
   *
   * [Helper] Get a `mutable` version of animator clip
   * @param entity
   * @param name
   */
  getClip(entity: Entity, name: string): PBAnimationState | null

  /**
   * @public
   *
   * [Helper] Set playing=true the animation `$name`
   * @param entity
   * @param name - animation name
   * @param resetCursor - the animation starts at 0 or continues from the current cursor position
   */
  playSingleAnim(entity: Entity, name: string, resetCursor?: boolean): boolean

  /**
   * @public
   *
   * [Helper] Set playing=false all animations
   * @param entity
   * @param resetCursor - the animation stops at 0 or at the current cursor position
   */
  stopAnims(entity: Entity, resetCursor?: boolean): boolean
}

export function defineAnimatorComponent(
  engine: PreEngine
): AnimatorComponentDefinition {
  const Animator = engine.getComponent<typeof AnimatorSchema.AnimatorSchema>(
    AnimatorSchema.COMPONENT_ID
  )

  return {
    ...Animator,
    getClip(entity: Entity, name: string): PBAnimationState | null {
      const anim = Animator.getMutableOrNull(entity)
      if (!anim) return null

      const state = anim.states.find((item) => item.name === name)
      if (!state) return null

      return state
    },
    playSingleAnim(
      entity: Entity,
      name: string,
      shouldReset: boolean = true
    ): boolean {
      // Get the mutable to modifying
      const animator = Animator.getMutableOrNull(entity)
      if (!animator) return false

      const animItem = animator.states.find((item) => item.name === name)
      if (!animItem) return false

      // Reset all other animations
      for (const state of animator.states) {
        state.playing = false
        state.shouldReset = true
      }

      animItem.playing = true
      animItem.shouldReset = shouldReset

      return true
    },

    stopAnims(entity: Entity, resetCursor: boolean = true): boolean {
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
