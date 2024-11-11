import { DeepReadonly, IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { Entity } from '../../engine/entity'
import { Vector3Type } from '../../schemas'
import { TransformSchema, TransformType } from '../manual/TransformSchema'
import { getGlobalPositionHelper } from './transform-utils/globalPosition'

/**
 * @public
 */
export type TransformComponent = LastWriteWinElementSetComponentDefinition<TransformType>

/**
 * @public
 */
export type MutableTransform = TransformType & {
  // Get calculated global position or set local position by passing the resultant one
  // Log and error in case of failing. Cyclic parenting, invalid scales or rotations could raise undefined behavior
  // Warning: this property usage might be expensive, use it wisely
  globalPosition: Vector3Type
}

/**
 * @public
 */
export type ReadonlyTransform = DeepReadonly<TransformType> & {
  // Get calculated global position
  // Log and error in case of failing. Cyclic parenting, invalid scales or rotations could raise undefined behavior
  // Warning: this property usage might be expensive, use it wisely
  globalPosition: Readonly<Vector3Type>
}

/**
 * @public
 */
export interface TransformComponentExtended extends TransformComponent {
  create(entity: Entity, val?: TransformTypeWithOptionals): MutableTransform
  createOrReplace(entity: Entity, val?: TransformTypeWithOptionals): MutableTransform
  get(entity: Entity): ReadonlyTransform
  getOrNull(entity: Entity): ReadonlyTransform | null
  getMutable(entity: Entity): MutableTransform
  getMutableOrNull(entity: Entity): MutableTransform | null
  getOrCreateMutable(entity: Entity, initialValue?: TransformTypeWithOptionals): MutableTransform
}

/**
 * @public
 */
export type TransformTypeWithOptionals = Partial<TransformType>

export function defineTransformComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): TransformComponentExtended {
  const transformDef = engine.defineComponentFromSchema('core::Transform', TransformSchema)
  const definePropertiesIfNotSet = getGlobalPositionHelper(transformDef)

  return {
    ...transformDef,
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
    getOrNull(entity: Entity): ReadonlyTransform | null {
      const component = transformDef.__data.get(entity)
      if (component) {
        definePropertiesIfNotSet(component)
      }
      return component ? (component as ReadonlyTransform) : null
    },

    // Functions below depend on the funtiosn above, the functions above are in charge of call `definePropertiesIfNotSet`

    getOrCreateMutable(entity: Entity, initialValue?: TransformTypeWithOptionals) {
      let value = transformDef.getMutableOrNull(entity)
      if (value === null) {
        value = this.createOrReplace(entity, initialValue)
      } else {
        transformDef.__dirtyIterator.add(entity)
      }
      return value as MutableTransform
    },
    get(entity: Entity): ReadonlyTransform {
      const component = this.getOrNull(entity)
      if (component === null) {
        throw new Error(`[getFrom] Component ${transformDef.componentName} for entity #${entity} not found`)
      }
      return component as ReadonlyTransform
    },
    getMutable(entity: Entity): MutableTransform {
      const component = this.get(entity)
      if (component) {
        transformDef.__dirtyIterator.add(entity)
      }
      return component as MutableTransform
    },
    getMutableOrNull(entity: Entity): MutableTransform {
      const component = this.getOrNull(entity)
      if (component) {
        transformDef.__dirtyIterator.add(entity)
      }
      return component as MutableTransform
    }
  }
}
