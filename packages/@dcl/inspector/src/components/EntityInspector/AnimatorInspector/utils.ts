import { AnimationGroup } from '@babylonjs/core'
import { Animator, Entity, PBAnimationState, PBAnimator } from '@dcl/ecs'

import { SdkContextValue } from '../../../lib/sdk/context'

export function fromNumber(value: string | number, mul: number = 100) {
  return Number(value) * mul
}

export function toNumber(value: string | number, div: number = 100) {
  return Number(value) / div
}

export function isValidWeight(weight: string | undefined): boolean {
  const value = (weight ?? 0).toString()
  return !isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100
}

export function isValidSpeed(speed: string | undefined): boolean {
  const value = (speed ?? 0).toString()
  return !isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 200
}

export function mapAnimationGroupsToStates(animations: AnimationGroup[]): PBAnimationState[] {
  return animations.map(($) => ({
    clip: $.name,
    playing: !!$.isPlaying,
    weight: $.weight ?? 1,
    speed: $.speedRatio ?? 1,
    loop: $.loopAnimation ?? false,
    shouldReset: false
  }))
}

export async function initializeAnimatorComponent(
  sdk: SdkContextValue,
  entity: Entity,
  animations: AnimationGroup[]
): Promise<PBAnimator> {
  const states = mapAnimationGroupsToStates(animations)
  const value: PBAnimator = { states }

  try {
    sdk.operations.addComponent(entity, Animator.componentId)
    sdk.operations.updateValue(Animator, entity, value)
    await sdk.operations.dispatch()
  } catch (error) {
    console.warn('Failed to initialize animator component:', error)
    throw error
  }

  return value
}
