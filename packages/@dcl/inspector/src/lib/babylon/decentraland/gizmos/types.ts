import { TransformNode } from '@babylonjs/core'
import { EcsEntity } from '../EcsEntity'

export interface IGizmoTransformer {
  setup(): void
  cleanup(): void
  setEntities(entities: EcsEntity[]): void
  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void
  update(entities: EcsEntity[], gizmoNode: TransformNode): void
  onDragEnd(): void
  onChange(callback: () => void): () => void
  setOnDragEndCallback?(callback: () => void): void
  enable?(): void
  setUpdateCallbacks?(...args: any[]): void
  setWorldAligned?(value: boolean): void
}

export const enum GizmoType {
  POSITION = 'position',
  ROTATION = 'rotation',
  SCALE = 'scale',
  FREE = 'free'
}

export type GizmoEventCallback = () => void
