import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type StatesInput = {
  value: string[]
  defaultValue?: string
}
