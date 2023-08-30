import { Entity } from '@dcl/ecs'
import { Actions } from '../ActionInspector/types'

export interface Props {
  entity: Entity
}

export enum Triggers {
  ON_CLICK = 'on_click'
}

export type Trigger = {
  type: Triggers
  entity?: Entity
  action?: Actions
}
