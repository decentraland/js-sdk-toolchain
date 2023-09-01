import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export enum Actions {
  PLAY_ANIMATION = 'play_animation'
}

export type Action = {
  name: string
  type: Actions
  animation?: string
}
