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

export async function initializeAnimatorComponent(
  sdk: SdkContextValue,
  entity: Entity,
  animations: AnimationGroup[]
): Promise<PBAnimator> {
  const states: PBAnimationState[] = animations.map(($) => ({
    clip: $.name,
    playing: false,
    weight: 1,
    speed: 1,
    loop: false,
    shouldReset: false
  }))

  const value: PBAnimator = { states }
  sdk.operations.addComponent(entity, Animator.componentId)
  sdk.operations.updateValue(Animator, entity, value)
  await sdk.operations.dispatch()

  return value
}
