import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type VideoPlayerInput = {
  src: string
  playing?: boolean
  loop?: boolean
  volume?: string
  playbackRate?: string
}
