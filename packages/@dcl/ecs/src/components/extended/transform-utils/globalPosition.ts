import { LastWriteWinElementSetComponentDefinition } from '../..'
import { Entity } from '../../../engine'
import { Vector3Type } from '../../../schemas'
import { Vector3 } from '../../generated/pb/decentraland/common/vectors.gen'
import { TransformType } from '../../manual/TransformSchema'
import { MutableTransform } from '../Transform'
import { applyQuaternionToVector3, multiplyQuaternionToRef, vector3AddToRef, vector3MultiplyToRef } from './math'

export function getGlobalPositionHelper(transformDef: LastWriteWinElementSetComponentDefinition<TransformType>) {
  const helperArray: Entity[] = []
  function getGlobalTransform(transform: TransformType): TransformType {
    const position = { ...transform.position }
    const scale = { ...transform.scale }
    const rotation = { ...transform.rotation }

    helperArray.length = 0
    let currentTransform = null
    if (transform.parent !== undefined) {
      currentTransform = transformDef.getMutableOrNull(transform.parent)
      helperArray.push(transform.parent)
    }
    while (currentTransform !== null) {
      // calculate position
      vector3MultiplyToRef(currentTransform.scale, position)
      applyQuaternionToVector3(currentTransform.rotation, position)
      vector3AddToRef(currentTransform.position, position)

      // calculate rotation
      multiplyQuaternionToRef(currentTransform.rotation, rotation)

      // calculate scale
      vector3MultiplyToRef(currentTransform.scale, scale)

      const nextTransform: TransformType | null =
        currentTransform.parent !== undefined ? transformDef.getMutableOrNull(currentTransform.parent) : null
      if (nextTransform !== null) {
        // We early return if we find a cyclic parent
        if (helperArray.includes(currentTransform.parent!)) {
          // TODO: should we throw an error instead?
          console.error(`There is a cyclic parent with entity ${currentTransform.parent}`)
          return {
            position,
            scale,
            rotation
          }
        }
        helperArray.push(currentTransform.parent!)
      }

      currentTransform = nextTransform
    }

    return {
      position,
      scale,
      rotation
    }
  }

  function getLocalPosition(transform: TransformType, globalPosition: Vector3) {
    const value = { ...globalPosition }
    const parentTransform = transform.parent !== undefined ? transformDef.getMutable(transform.parent) : null
    if (parentTransform !== null) {
      const parentGlobalTransform = getGlobalTransform(parentTransform)

      // Subtract parent position
      value.x -= parentGlobalTransform.position.x
      value.y -= parentGlobalTransform.position.y
      value.z -= parentGlobalTransform.position.z

      // Apply inverse rotation of the parent's global rotation
      const inverseParentRotation = { ...parentGlobalTransform.rotation }
      inverseParentRotation.x *= -1
      inverseParentRotation.y *= -1
      inverseParentRotation.z *= -1
      applyQuaternionToVector3(inverseParentRotation, value)

      // Divide by parent scale
      value.x /= parentGlobalTransform.scale.x
      value.y /= parentGlobalTransform.scale.y
      value.z /= parentGlobalTransform.scale.z
    }
    return value
  }

  const extendedTransformProperties: PropertyDescriptorMap & ThisType<TransformType> = {
    globalPosition: {
      get(): Vector3Type {
        return getGlobalTransform(this).position
      },
      set(value: Vector3Type) {
        const newPosition = getLocalPosition(this, value)
        // if some of its component is NaN, we don't update the position (there is an undefined behaviour otherwise)
        if (!Number.isFinite(newPosition.x) || !Number.isFinite(newPosition.y) || !Number.isFinite(newPosition.z)) {
          // TODO: should we throw an error instead?
          return
        }
        this.position = newPosition
      },
      enumerable: false
    },
    __extended: {
      value: true,
      enumerable: false,
      writable: false
    }
  }

  return (value: Partial<MutableTransform>) => {
    if ((value as any).__extended !== true) {
      Object.defineProperties(value, extendedTransformProperties)
    }
  }
}
