import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type GltfContainerInput = {
  src: string
  visibleMeshesCollisionMask: string
  invisibleMeshesCollisionMask: string
}
