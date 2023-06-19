import { Entity, TransformComponentExtended } from '@dcl/ecs'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'

export function getWorldMatrix(entity: Entity, transformComponent: TransformComponentExtended): Matrix.ReadonlyMatrix {
  const transform = transformComponent.getOrNull(entity)
  if (!transform) return Matrix.Identity()

  const localMatrix = Matrix.compose(transform.scale, transform.rotation, transform.position)

  if (!transform.parent) return localMatrix
  else return Matrix.multiply(localMatrix, getWorldMatrix(transform.parent, transformComponent))
}

export function getLocalMatrixAfterReparenting(
  child: Entity,
  parent: Entity,
  transformComponent: TransformComponentExtended
) {
  const childWorld = getWorldMatrix(child, transformComponent)
  const parentWorld = getWorldMatrix(parent, transformComponent)
  return Matrix.multiply(childWorld, Matrix.invert(parentWorld))
}
