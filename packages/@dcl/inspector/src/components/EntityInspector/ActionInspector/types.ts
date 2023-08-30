import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export enum Actions {
  PLAY_ANIMATION = 'play_animation',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  GO_TO_END = 'go_to_end',
  GO_TO_START = 'go_to_start'
}

export type Action = {
  name: string
  type: Actions
  animation?: string
}
