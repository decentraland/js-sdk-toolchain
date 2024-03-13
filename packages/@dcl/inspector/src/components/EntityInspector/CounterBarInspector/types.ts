import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type CounterBarInput = {
  primaryColor: string
  secondaryColor: string
  maxValue: string
}
