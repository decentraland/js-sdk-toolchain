import { TransformType, Vector3Type } from '@dcl/ecs'
import { Quaternion } from '@babylonjs/core'

import { TransformConfig } from '../../../lib/sdk/components/TransformConfig'
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
  const sanitizedAngle = angle < 0 ? 360 + angle : angle
  const value = sanitizedAngle.toFixed(2)
  return value === '360.00' ? '0.00' : value
}

export function toTransform(currentValue?: TransformType, config?: TransformConfig) {
  return (inputs: TransformInput): TransformType => {
    const quaternion = Quaternion.RotationYawPitchRoll(
      (Number(inputs.rotation.y) * Math.PI) / 180,
      (Number(inputs.rotation.x) * Math.PI) / 180,
      (Number(inputs.rotation.z) * Math.PI) / 180
    )
    const scale = mapToNumber(inputs.scale)

    return {
      position: mapToNumber(inputs.position),
      scale: currentValue ? getScale(currentValue.scale, scale, !!config?.porportionalScaling) : scale,
      rotation: {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
      }
    }
  }
}

export const mapToNumber = <T extends Record<string, unknown>>(input: T): { [key in keyof T]: number } => {
  const res: any = {}
  for (const key in input) {
    const value = Number(input[key])
    res[key] = isNaN(value) ? 0 : value
  }
  return res
}

export const getScale = (oldValue: Vector3Type, value: Vector3Type, maintainPorportion: boolean) => {
  if (!maintainPorportion) return value

  let changedFactor: keyof Vector3Type | undefined = undefined

  for (const factor in value) {
    const key = factor as keyof Vector3Type
    if (oldValue[key] !== value[key]) {
      changedFactor = key
      break
    }
  }

  if (changedFactor === undefined) return value

  const vector = { ...value }

  for (const factor in vector) {
    const key = factor as keyof Vector3Type
    if (changedFactor === key) continue
    const div = oldValue[changedFactor] || 1
    const sign = Math.sign(value[changedFactor])
    vector[key] = Math.abs((value[changedFactor] / div) * (value[key] || value[changedFactor])) * sign
  }

  return vector
}

export function fromTransformConfig(value: TransformConfig) {
  return {
    porportionalScaling: !!value.porportionalScaling
  }
}
