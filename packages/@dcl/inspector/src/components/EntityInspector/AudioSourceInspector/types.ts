import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type AudioSourceInput = {
  audioClipUrl: string
  playing?: boolean
  loop?: boolean
  volume?: string
}
