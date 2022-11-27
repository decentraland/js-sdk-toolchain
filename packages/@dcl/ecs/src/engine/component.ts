import type { ISchema } from '../schemas/ISchema'
import { ByteBuffer, createByteBuffer } from '../serialization/ByteBuffer'
import { Entity } from './entity'
import { deepReadonly, DeepReadonly } from './readonly'

/**
 * @public
 */
export type EcsResult<T extends ISchema> = T extends ISchema
  ? ReturnType<T['deserialize']>
  : never

/**
 * @public
 */
export type ComponentType<T extends ISchema> = EcsResult<T>

/**
 * @public
 */
export type ComponentDefinition<
  T extends ISchema<ConstructorType>,
  ConstructorType = any
> = {
  _id: number

  /**
   * Return the default value of the current component
   */
  default(): DeepReadonly<ComponentType<T>>

  /**
   * Get if the entity has this component
   * @param entity
   *
   * Example:
   * ```ts
   * const myEntity = engine.addEntity()
   * Transform.has(myEntity) // return false
   * Transform.create(myEntity)
   * Transform.has(myEntity) // return true
   * ```
   */
  has(entity: Entity): boolean

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead), throw an error if the entity doesn't have the component.
   * @param entity
   * @return
   * Example:
   * ```ts
   * const myEntity = engine.addEntity()
   * Transform.create(myEntity)
   * const transform = Transform.get(myEntity) // return true
   * log(transform.position.x === 0) // log 'true'
   *
   * transform.position.y = 10 // illegal statement, to mutate the component use getMutable
   * ```
   *
   * ```ts
   * const otherEntity = engine.addEntity()
   * Transform.get(otherEntity) // throw an error!!
   * ```
   */
  get(entity: Entity): DeepReadonly<ComponentType<T>>

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead), or null if the entity doesn't have the component.
   * @param entity
   * @return
   *
   * Example:
   * ```ts
   * const otherEntity = engine.addEntity()
   * log(Transform.get(otherEntity) === null) // log 'true'
   * ```
   */
  getOrNull(entity: Entity): DeepReadonly<ComponentType<T>> | null

  /**
   * Add the current component to an entity, throw an error if the component already exists (use `createOrReplace` instead).
   * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
   * @param entity
   * @param val The initial value
   *
   * Example:
   * ```ts
   * const myEntity = engine.addEntity()
   * Transform.create(myEntity, { ...Transform.default(), position: {x: 4, y: 0, z: 4} }) // ok!
   * Transform.create(myEntity) // throw an error, the `Transform` component already exists in `myEntity`
   * ````
   */
  create(entity: Entity, val?: ConstructorType): ComponentType<T>
  /**
   * Add the current component to an entity or replace the content if the entity already has the component
   * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
   * @param entity
   * @param val The initial or new value
   *
   * Example:
   * ```ts
   * const myEntity = engine.addEntity()
   * Transform.create(myEntity) // ok!
   * Transform.createOrReplace(myEntity, { ...Transform.default(), position: {x: 4, y: 0, z: 4} }) // ok!
   * ````
   */
  createOrReplace(entity: Entity, val?: ConstructorType): ComponentType<T>

  /**
   * Delete the current component to an entity, return null if the entity doesn't have the current component.
   * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
   * @param entity
   *
   * Example:
   * ```ts
   * const myEntity = engine.addEntity()
   * Transform.create(myEntity) // ok!
   * Transform.deleteFrom(myEntity) // return the component
   * Transform.deleteFrom(myEntity) // return null
   * ````
   */
  deleteFrom(entity: Entity): ComponentType<T> | null

  /**
   * Get the mutable component of the entity, throw an error if the entity doesn't have the component.
   * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
   * @param entity
   *
   * Example:
   * ```ts
   * const myEntity = engine.addEntity()
   * Transform.create(myEntity)
   * Transform.getMutable(myEntity).position = {x: 4, y: 0, z: 4}
   * ````
   */
  getMutable(entity: Entity): ComponentType<T>

  /**
   * Get the mutable component of the entity, return null if the entity doesn't have the component.
   * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
   * @param entity
   *
   * Example:
   * ```ts
   * const transform = Transform.getMutableOrNull(myEntity)
   * if (transform) {
   *   transform.position = {x: 4, y: 0, z: 4}
   * }
   * ````
   */
  getMutableOrNull(entity: Entity): ComponentType<T> | null

  /**
   * @internal
   * @param entity
   * @param data
   */
  upsertFromBinary(entity: Entity, data: ByteBuffer): ComponentType<T> | null
  /**
   * @internal
   * @param entity
   * @param data
   */
  updateFromBinary(entity: Entity, data: ByteBuffer): ComponentType<T> | null

  // allocates a buffer and returns new buffer
  /**
   * @internal
   * @param entity
   */
  toBinary(entity: Entity): ByteBuffer

  // writes to a pre-allocated buffer
  writeToByteBuffer(entity: Entity, buffer: ByteBuffer): void

  /**
   * @internal Use engine.getEntitiesWith(Component) instead.
   * Get the iterator to every entity has the component
   */
  iterator(): Iterable<[Entity, ComponentType<T>]>

  // Dirty
  /**
   * @internal
   */
  dirtyIterator(): Iterable<Entity>
  /**
   * @internal
   */
  clearDirty(): void
  /**
   * @internal
   */
  isDirty(entity: Entity): boolean
}

export function defineComponent<
  T extends ISchema,
  ConstructorType = ComponentType<T>
>(
  componentId: number,
  spec: T,
  constructorDefault?: ConstructorType
  // meta: { syncFlags }
): ComponentDefinition<T, ConstructorType> {
  const data = new Map<Entity, ComponentType<T>>()
  const dirtyIterator = new Set<Entity>()

  const defaultBuffer = createByteBuffer()
  if (constructorDefault) {
    spec.serialize(constructorDefault, defaultBuffer)
  }

  function getDefaultValue() {
    if (constructorDefault) {
      return spec.deserialize(
        createByteBuffer({
          writing: {
            buffer: defaultBuffer.buffer(),
            currentOffset: defaultBuffer.currentWriteOffset()
          }
        })
      )
    } else {
      return spec.create()
    }
  }

  function prefillValue(value: ConstructorType) {
    return { ...getDefaultValue(), ...value }
  }

  return {
    _id: componentId,
    default() {
      return getDefaultValue()
    },
    isDirty(entity: Entity): boolean {
      return dirtyIterator.has(entity)
    },
    has(entity: Entity): boolean {
      return data.has(entity)
    },
    deleteFrom(entity: Entity): ComponentType<T> | null {
      const component = data.get(entity)
      data.delete(entity)
      dirtyIterator.add(entity)
      return component || null
    },
    getOrNull(entity: Entity): DeepReadonly<ComponentType<T>> | null {
      const component = data.get(entity)
      return component ? deepReadonly(component) : null
    },
    get(entity: Entity): DeepReadonly<ComponentType<T>> {
      const component = data.get(entity)
      if (!component) {
        throw new Error(
          `[getFrom] Component ${componentId} for entity #${entity} not found`
        )
      }
      return deepReadonly(component)
    },
    create(entity: Entity, value?: ConstructorType): ComponentType<T> {
      const component = data.get(entity)
      if (component) {
        throw new Error(
          `[create] Component ${componentId} for ${entity} already exists`
        )
      }
      const usedValue =
        value === undefined ? getDefaultValue() : prefillValue(value)
      data.set(entity, usedValue)
      dirtyIterator.add(entity)
      return usedValue
    },
    createOrReplace(entity: Entity, value?: ConstructorType): ComponentType<T> {
      const usedValue =
        value === undefined ? getDefaultValue() : prefillValue(value)
      data.set(entity, usedValue!)
      dirtyIterator.add(entity)
      return usedValue!
    },
    getMutableOrNull(entity: Entity): ComponentType<T> | null {
      const component = data.get(entity)
      if (!component) {
        return null
      }
      dirtyIterator.add(entity)
      return component
    },
    getMutable(entity: Entity): ComponentType<T> {
      const component = this.getMutableOrNull(entity)
      if (component === null) {
        throw new Error(
          `[mutable] Component ${componentId} for ${entity} not found`
        )
      }
      return component
    },
    *iterator(): Iterable<[Entity, ComponentType<T>]> {
      for (const [entity, component] of data) {
        yield [entity, component]
      }
    },
    *dirtyIterator(): Iterable<Entity> {
      for (const entity of dirtyIterator) {
        yield entity
      }
    },
    toBinary(entity: Entity): ByteBuffer {
      const component = data.get(entity)
      if (!component) {
        throw new Error(
          `[toBinary] Component ${componentId} for ${entity} not found`
        )
      }

      const writeBuffer = createByteBuffer()
      spec.serialize(component, writeBuffer)
      return writeBuffer
    },
    writeToByteBuffer(entity: Entity, buffer: ByteBuffer): void {
      const component = data.get(entity)
      if (!component) {
        throw new Error(
          `[writeToByteBuffer] Component ${componentId} for entity #${entity} not found`
        )
      }

      spec.serialize(component, buffer)
    },
    updateFromBinary(
      entity: Entity,
      buffer: ByteBuffer
    ): ComponentType<T> | null {
      const component = data.get(entity)
      if (!component) {
        throw new Error(
          `[updateFromBinary] Component ${componentId} for ${entity} not found`
        )
      }
      return this.upsertFromBinary(entity, buffer)
    },
    upsertFromBinary(
      entity: Entity,
      buffer: ByteBuffer
    ): ComponentType<T> | null {
      const newValue = spec.deserialize(buffer)
      data.set(entity, newValue)
      dirtyIterator.add(entity)
      return newValue
    },
    clearDirty() {
      dirtyIterator.clear()
    }
  }
}
