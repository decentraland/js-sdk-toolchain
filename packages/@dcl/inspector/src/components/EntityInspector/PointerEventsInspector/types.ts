import { Entity, PBPointerEvents_Entry } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type AnimatorInput = {
  pointerEvents: PBPointerEvents_Entry[]
}
