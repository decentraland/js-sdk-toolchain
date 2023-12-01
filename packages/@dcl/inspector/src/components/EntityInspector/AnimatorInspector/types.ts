import { Entity, PBAnimationState } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type AnimatorInput = {
  states: PBAnimationState[]
}
