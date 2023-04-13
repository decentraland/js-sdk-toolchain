import { TransformType } from '@dcl/ecs'
import { Quaternion } from '@dcl/ecs-math'
import { TransformInput } from './types'

export function fromTranform(value: TransformType): TransformInput {
  const angles = Quaternion.toEulerAngles(value.rotation)
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
      x: formatAngle(angles.x),
      y: formatAngle(angles.y),
      z: formatAngle(angles.z)
    }
  }
}

function formatAngle(angle: number) {
  const value = angle.toFixed(2)
  return value === '360.00' ? '0.00' : value
}

export function toTransform(inputs: TransformInput): TransformType {
  const rotation = Quaternion.fromEulerDegrees(
    Number(inputs.rotation.x),
    Number(inputs.rotation.y),
    Number(inputs.rotation.z)
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
    rotation
  }
}
