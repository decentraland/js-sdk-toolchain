import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type AudioStreamInput = {
  url: string
  playing?: boolean
  volume?: string
}
