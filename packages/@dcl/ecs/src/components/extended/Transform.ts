import { DeepReadonly, IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { Entity } from '../../engine/entity'
import { Vector3Type } from '../../schemas'
import { Quaternion, Vector3 } from '../generated/pb/decentraland/common/vectors.gen'
import { TransformSchema, TransformType } from '../manual/TransformSchema'

/**
 * @public
 */
export type TransformComponent = LastWriteWinElementSetComponentDefinition<TransformType>

/**
 * @public
 */
export type MutableTransform = TransformType & {
  globalPosition: Vector3Type
}

/**
 * @public
 */
export type ReadonlyTransformType = DeepReadonly<TransformType> & {
  globalPosition: Readonly<Vector3Type>
}

/**
 * @public
 */
export interface TransformComponentExtended extends TransformComponent {
  create(entity: Entity, val?: TransformTypeWithOptionals): MutableTransform
  createOrReplace(entity: Entity, val?: TransformTypeWithOptionals): MutableTransform

  get(entity: Entity): ReadonlyTransformType
  getOrNull(entity: Entity): ReadonlyTransformType | null
  getMutable(entity: Entity): MutableTransform
  getMutableOrNull(entity: Entity): MutableTransform | null
  getOrCreateMutable(entity: Entity, initialValue?: TransformTypeWithOptionals): MutableTransform
}

/**
 * @public
 */
export type TransformTypeWithOptionals = Partial<TransformType>

function multiplyQuaternionToRef(q1: Quaternion, ref: Quaternion): void {
  const x = q1.w * ref.x + q1.x * ref.w + q1.y * ref.z - q1.z * ref.y
  const y = q1.w * ref.y - q1.x * ref.z + q1.y * ref.w + q1.z * ref.x
  const z = q1.w * ref.z + q1.x * ref.y - q1.y * ref.x + q1.z * ref.w
  const w = q1.w * ref.w - q1.x * ref.x - q1.y * ref.y - q1.z * ref.z

  ref.x = x
  ref.y = y
  ref.z = z
  ref.w = w
}

function applyQuaternionToVector3(q: Quaternion, ref: Vector3): void {
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

function vector3AddToRef(v1: Vector3, ref: Vector3): void {
  ref.x += v1.x
  ref.y += v1.y
  ref.z += v1.z
}

function vector3MultiplyToRef(v1: Vector3, ref: Vector3): void {
  ref.x *= v1.x
  ref.y *= v1.y
  ref.z *= v1.z
}

export function defineTransformComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): TransformComponentExtended {
  const transformDef = engine.defineComponentFromSchema('core::Transform', TransformSchema)

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

      if (currentTransform.parent !== undefined) {
        currentTransform =
          currentTransform.parent !== undefined ? transformDef.getMutableOrNull(currentTransform.parent) : null

        if (currentTransform?.parent) {
          helperArray.push(currentTransform.parent)
          if (helperArray.includes(currentTransform.parent)) {
            throw new Error('Circular dependency detected in transform hierarchy')
          }
        }
      } else {
        currentTransform = null
      }
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
        this.position = getLocalPosition(this, value)
      }
    }
  }

  function definePropertiesIfNotSet(value?: Partial<MutableTransform>) {
    if (value?.globalPosition === undefined) {
      Object.defineProperties(value, extendedTransformProperties)
    }
  }

  return {
    ...(transformDef as any),
    create(entity: Entity, val?: TransformTypeWithOptionals) {
      const value = transformDef.create(entity, TransformSchema.extend!(val))
      definePropertiesIfNotSet(value)
      return value as MutableTransform
    },
    createOrReplace(entity: Entity, val?: TransformTypeWithOptionals) {
      const value = transformDef.createOrReplace(entity, TransformSchema.extend!(val))
      definePropertiesIfNotSet(value)
      return value as MutableTransform
    },
    getOrCreateMutable(entity: Entity, initialValue?: TransformTypeWithOptionals) {
      let value = transformDef.getMutableOrNull(entity)
      if (value === null) {
        value = this.createOrReplace(entity, initialValue)
      }
      return value as MutableTransform
    },
    getOrNull(entity: Entity): ReadonlyTransformType | null {
      const component = transformDef._data.get(entity)
      definePropertiesIfNotSet(component)
      return component ? (component as ReadonlyTransformType) : null
    },
    get(entity: Entity): ReadonlyTransformType {
      const component = this.getOrNull(entity)
      if (!component) {
        throw new Error(`[getFrom] Component ${transformDef.componentName} for entity #${entity} not found`)
      }
      definePropertiesIfNotSet(component)
      return component as ReadonlyTransformType
    },
    getMutable(entity: Entity): MutableTransform {
      const component = this.get(entity)
      return component as MutableTransform
    },
    getMutableOrNull(entity: Entity): MutableTransform {
      const component = this.getOrNull(entity)
      return component as MutableTransform
    }
  }
}
