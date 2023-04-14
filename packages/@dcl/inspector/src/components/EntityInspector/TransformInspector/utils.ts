import { TransformType } from '@dcl/ecs'
import { Quaternion } from '@babylonjs/core'
import { TransformInput } from './types'

export function fromTransform(value: TransformType): TransformInput {
  const angles = new Quaternion(value.rotation.x, value.rotation.y, value.rotation.z, value.rotation.w).toEulerAngles()
  return {
    position: {
      x: value.position.x.toFixed(2),
      y: value.position.y.toFixed(2),
      z: value.position.z.toFixed(2)
    },
    scale: {
      x: value.scale.x.toFixed(2),
      y: value.scale.y.toFixed(2),
      z: value.scale.z.toFixed(2)
    },
    rotation: {
      x: formatAngle((angles.x * 180) / Math.PI),
      y: formatAngle((angles.y * 180) / Math.PI),
      z: formatAngle((angles.z * 180) / Math.PI)
    }
  }
}

function formatAngle(angle: number) {
  const value = angle.toFixed(2)
  return value === '360.00' ? '0.00' : value
}

export function toTransform(inputs: TransformInput): TransformType {
  const quaternion = Quaternion.RotationYawPitchRoll(
    (Number(inputs.rotation.y) * Math.PI) / 180,
    (Number(inputs.rotation.x) * Math.PI) / 180,
    (Number(inputs.rotation.z) * Math.PI) / 180
  )
  return {
    position: {
      x: Number(inputs.position.x),
      y: Number(inputs.position.y),
      z: Number(inputs.position.z)
    },
    scale: {
      x: Number(inputs.scale.x),
      y: Number(inputs.scale.y),
      z: Number(inputs.scale.z)
    },
    rotation: {
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w
    }
  }
}
