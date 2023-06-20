import { Entity, TransformComponentExtended } from '@dcl/ecs'
import { Quaternion, Vector3, Epsilon } from '@dcl/ecs-math'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'

export function getWorldMatrix(entity: Entity, transformComponent: TransformComponentExtended): Matrix.ReadonlyMatrix {
  const transform = transformComponent.getOrNull(entity)
  if (!transform) return Matrix.Identity()

  const localMatrix = Matrix.compose(transform.scale, transform.rotation, transform.position)
  if (!transform.parent) return localMatrix

  return Matrix.multiply(localMatrix, getWorldMatrix(transform.parent, transformComponent))
}

export function areSRTMatrixesEqualWithEpsilon(m1: Matrix.ReadonlyMatrix, m2: Matrix.ReadonlyMatrix) {
  const tOut1 = Vector3.create()
  const sOut1 = Vector3.create()
  const rOut1 = Quaternion.create()

  if (!Matrix.decompose(m1, sOut1, rOut1, tOut1)) throw new Error(`${Matrix.toArray(m1)} is not an SRT matrix`)

  const tOut2 = Vector3.create()
  const sOut2 = Vector3.create()
  const rOut2 = Quaternion.create()

  if (!Matrix.decompose(m2, sOut2, rOut2, tOut2)) throw new Error(`${Matrix.toArray(m2)} is not an SRT matrix`)

  return (
    Vector3.equalsWithEpsilon(tOut1, tOut2) &&
    Vector3.equalsWithEpsilon(sOut1, sOut2) &&
    Math.abs(Quaternion.angle(rOut1, rOut2)) < Epsilon
  )
}
