import { Entity } from '@dcl/ecs'

import { MeshType } from '../MeshRendererInspector/types'

export interface Props {
  entity: Entity
}

export type MeshColliderInput = {
  mesh: MeshType
  radiusTop?: string
  radiusBottom?: string
  collisionMask?: string
}
