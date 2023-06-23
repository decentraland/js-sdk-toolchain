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

/*
  Calculates position of an apex of a cone with following properties:
  1. Cone's axis of rotation is the line between pos and spherePos.
  2. Sphere centered at spherePos with radius sphereRadius is inscribed into the cone.
*/
export function fitSphereIntoCone(
  pos: Vector3,
  coneAngle: number,
  spherePos: Vector3,
  sphereRadius: number
): Vector3.MutableVector3 {
  const direction = Vector3.subtract(spherePos, pos)
  if (Vector3.equalsWithEpsilon(direction, Vector3.Zero()))
    throw new Error(`near equal pos and spherePos: ${JSON.stringify(pos)}`)
  const t = Vector3.length(direction) - sphereRadius / Math.tan(coneAngle)
  const normalizedDirection = Vector3.normalize(direction)
  return Vector3.add(pos, Vector3.scale(normalizedDirection, t))
}

/*
  Given a sphere and camera's frustum, finds a point on the line between
  sphere's and camera's positions such that a sphere would fit into a frustum,
  if a camera was situated at that point and was looking at sphere's center.
  It also ensures that computed position respects minimal height contstraint.
*/
export function fitSphereIntoCameraFrustum(
  cameraPos: Vector3,
  verticalFov: number,
  aspectRatio: number,
  cameraNearZ: number,
  cameraMinY: number,
  spherePos: Vector3,
  sphereRadius: number
): Vector3 {
  let adjustedCameraPos = cameraPos
  if (Vector3.equalsWithEpsilon(Vector3.subtract(spherePos, cameraPos), Vector3.Zero()))
    adjustedCameraPos = Vector3.add(spherePos, Vector3.create(0, 1, 0))

  const horizontalFov = 2 * Math.atan(aspectRatio * Math.tan(verticalFov / 2))
  const coneAngle = Math.min(horizontalFov, verticalFov) / 2

  let adjustedSphereRadius = sphereRadius
  // if a sphere is too small, parts of it would be behind near plane of camera
  const distance = sphereRadius * (1 / Math.sin(coneAngle) - 1)
  if (distance < cameraNearZ) {
    adjustedSphereRadius = cameraNearZ / (1 / Math.sin(coneAngle) - 1)
  }

  let position = fitSphereIntoCone(adjustedCameraPos, coneAngle, spherePos, adjustedSphereRadius)
  if (position.y < cameraMinY) {
    let direction = Vector3.subtract(spherePos, position)
    // if Y limit is violated and camera looks up, symmetrically reflect its position so that it looks down
    if (direction.y > 0) {
      position = Vector3.add(spherePos, direction)
      direction = Vector3.scale(direction, -1)
    }
    // camera looks down, therefore raising it won't violate sphere-frustum fit
    if (position.y < cameraMinY) {
      position.y = cameraMinY
    }
  }
  return position
}
