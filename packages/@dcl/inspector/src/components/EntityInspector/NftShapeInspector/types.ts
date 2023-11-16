import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type NftShapeInput = {
  urn: string
  color?: string
  style?: string
}
