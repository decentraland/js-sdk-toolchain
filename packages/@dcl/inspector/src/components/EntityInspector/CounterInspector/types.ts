import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type CounterInput = {
  id: string
  value: string
}
