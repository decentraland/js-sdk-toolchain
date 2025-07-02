import { TransformNode } from '@babylonjs/core'
import { EcsEntity } from '../EcsEntity'

export interface IGizmoTransformer {
  setup(): void
  cleanup(): void
  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void
  update(entities: EcsEntity[], gizmoNode: TransformNode): void
  onDragEnd(): void
  onChange(callback: () => void): () => void
}

export const enum GizmoType {
  POSITION = 'position',
  ROTATION = 'rotation',
  SCALE = 'scale',
  FREE = 'free'
}

export type GizmoEventCallback = () => void
