import { Quaternion, Vector3 } from '../../generated/pb/decentraland/common/vectors.gen'

export function multiplyQuaternionToRef(q1: Quaternion, ref: Quaternion): void {
  const x = q1.w * ref.x + q1.x * ref.w + q1.y * ref.z - q1.z * ref.y
  const y = q1.w * ref.y - q1.x * ref.z + q1.y * ref.w + q1.z * ref.x
  const z = q1.w * ref.z + q1.x * ref.y - q1.y * ref.x + q1.z * ref.w
  const w = q1.w * ref.w - q1.x * ref.x - q1.y * ref.y - q1.z * ref.z

  ref.x = x
  ref.y = y
  ref.z = z
  ref.w = w
}

export function applyQuaternionToVector3(q: Quaternion, ref: Vector3): void {
  const { x, y, z } = ref
  const qx = q.x,
    qy = q.y,
    qz = q.z,
    qw = q.w

  // Calculate quat * vector
  const ix = qw * x + qy * z - qz * y
  const iy = qw * y + qz * x - qx * z
  const iz = qw * z + qx * y - qy * x
  const iw = -qx * x - qy * y - qz * z

  ref.x = ix * qw + iw * -qx + iy * -qz - iz * -qy
  ref.y = iy * qw + iw * -qy + iz * -qx - ix * -qz
  ref.z = iz * qw + iw * -qz + ix * -qy - iy * -qx
}

export function vector3AddToRef(v1: Vector3, ref: Vector3): void {
  ref.x += v1.x
  ref.y += v1.y
  ref.z += v1.z
}

export function vector3MultiplyToRef(v1: Vector3, ref: Vector3): void {
  ref.x *= v1.x
  ref.y *= v1.y
  ref.z *= v1.z
}
