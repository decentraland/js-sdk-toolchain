import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type TransformInput = {
  position: {
    x: string
    y: string
    z: string
  }
  scale: {
    x: string
    y: string
    z: string
  }
  rotation: {
    x: string
    y: string
    z: string
  }
}
