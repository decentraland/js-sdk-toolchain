import { Entity, TransformComponentExtended } from '@dcl/ecs'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'

export function getWorldMatrix(entity: Entity, transformComponent: TransformComponentExtended): Matrix.ReadonlyMatrix {
  const transform = transformComponent.getOrNull(entity)
  if (!transform) return Matrix.Identity()

  const localMatrix = Matrix.compose(transform.scale, transform.rotation, transform.position)
  if (!transform.parent) return localMatrix

  return Matrix.multiply(localMatrix, getWorldMatrix(transform.parent, transformComponent))
}
