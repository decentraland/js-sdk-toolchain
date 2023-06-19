import { Entity, TransformComponentExtended } from "@dcl/ecs";
import { Quaternion, Vector3 } from "@dcl/ecs-math";
import { Matrix } from "@dcl/ecs-math/dist/Matrix";

export function decomposeMatrixSRT(
  self: Matrix.ReadonlyMatrix,
  scale?: Vector3.MutableVector3,
  rotation?: Quaternion.MutableQuaternion,
  translation?: Vector3.MutableVector3
): boolean {
  if (self.isIdentity) {
    if (translation) {
      translation = Vector3.create(0, 0, 0)
    }
    if (scale) {
      scale = Vector3.create(0, 0, 0)
    }
    if (rotation) {
      rotation = Quaternion.create(0, 0, 0, 1)
    }
    return true
  }

  const m = self._m
  if (translation) {
    translation.x = m[12]
    translation.y = m[13]
    translation.z = m[14]
  }

  const usedScale = scale || Vector3.Zero()
  usedScale.x = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2])
  usedScale.y = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6])
  usedScale.z = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10])

  if (Matrix.determinant(self) <= 0) {
    usedScale.y *= -1
  }

  if (usedScale.x === 0 || usedScale.y === 0 || usedScale.z === 0) {
    if (rotation) {
      rotation = Quaternion.create(0, 0, 0, 1)
    }
    return false
  }

  if (rotation) {
    // tslint:disable-next-line:one-variable-per-declaration
    const sx = 1 / usedScale.x,
      sy = 1 / usedScale.y,
      sz = 1 / usedScale.z
    const tmpMatrix = Matrix.create()
    Matrix.fromValuesToRef(
      m[0] * sx,
      m[1] * sx,
      m[2] * sx,
      0.0,
      m[4] * sy,
      m[5] * sy,
      m[6] * sy,
      0.0,
      m[8] * sz,
      m[9] * sz,
      m[10] * sz,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
      tmpMatrix
    )

    Quaternion.fromRotationMatrixToRef(tmpMatrix, rotation)
  }

  return true
}

export function getWorldMatrix(entity: Entity, transformComponent: TransformComponentExtended): Matrix.ReadonlyMatrix {
  const transform = transformComponent.getOrNull(entity)
  if (!transform)
    return Matrix.Identity()

  const localMatrix = Matrix.compose(transform.scale, transform.rotation, transform.position)

  if (!transform.parent)
    return localMatrix
  else
    return Matrix.multiply(localMatrix, getWorldMatrix(transform.parent, transformComponent))
}

export function getLocalMatrixAfterReparenting(child: Entity, parent: Entity, transformComponent: TransformComponentExtended) {
  const childWorld = getWorldMatrix(child, transformComponent)
  const parentWorld = getWorldMatrix(parent, transformComponent)
  return Matrix.multiply(childWorld, Matrix.invert(parentWorld))
}
