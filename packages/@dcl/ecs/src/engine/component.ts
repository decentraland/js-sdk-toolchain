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
   * @param entity - entity to test
   */
  has(entity: Entity): boolean

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead), throw an error if the entity doesn't have the component.
   * @param entity - Entity that will be used to get the component
   * @returns
   */
  get(entity: Entity): DeepReadonly<ComponentType<T>>

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead), or null if the entity doesn't have the component.
   * @param entity - Entity that will be used to try to get the component
   */
  getOrNull(entity: Entity): DeepReadonly<ComponentType<T>> | null

  /**
   * Add the current component to an entity, throw an error if the component already exists (use `createOrReplace` instead).
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create the component
   * @param val - The initial value
   */
  create(entity: Entity, val?: ConstructorType): ComponentType<T>
  /**
   * Add the current component to an entity or replace the content if the entity already has the component
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create or replace the component
   * @param val - The initial or new value
   */
  createOrReplace(entity: Entity, val?: ConstructorType): ComponentType<T>

  /**
   * @internal
   * Delete the current component to an entity, return null if the entity doesn't have the current component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to delete the component from
   * @param markAsDirty - defaults to true
   */
  deleteFrom(entity: Entity, markAsDirty?: boolean): ComponentType<T> | null
  /**
   * @public
   * Delete the current component to an entity, return null if the entity doesn't have the current component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to delete the component from
   */
  deleteFrom(entity: Entity): ComponentType<T> | null

  /**
   * Get the mutable component of the entity, throw an error if the entity doesn't have the component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to get the component from
   */
  getMutable(entity: Entity): ComponentType<T>

  /**
   * Get the mutable component of the entity, return null if the entity doesn't have the component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to get the component from
   */
  getMutableOrNull(entity: Entity): ComponentType<T> | null

  /**
   * @internal
   * @param entity - entity-component to update
   * @param data - data to update the entity-component
   * @param markAsDirty - defaults to true
   */
  upsertFromBinary(
    entity: Entity,
    data: ByteBuffer,
    markAsDirty?: boolean
  ): ComponentType<T> | null
  /**
   * @internal
   * @param entity - entity-component to update
   * @param data - data to update the entity-component
   * @param markAsDirty - defaults to true
   */
  updateFromBinary(
    entity: Entity,
    data: ByteBuffer,
    markAsDirty?: boolean
  ): ComponentType<T> | null

  // allocates a buffer and returns new buffer
  /**
   * @internal
   * @param entity - Entity to serizalie
   */
  toBinary(entity: Entity): ByteBuffer

  // allocates a buffer and returns new buffer if it exists or null
  /**
   * @internal
   * @param entity - Entity to serizalie
   */
  toBinaryOrNull(entity: Entity): ByteBuffer | null

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
    deleteFrom(entity: Entity, markAsDirty = true): ComponentType<T> | null {
      const component = data.get(entity)
      data.delete(entity)
      if (markAsDirty) {
        dirtyIterator.add(entity)
      } else {
        dirtyIterator.delete(entity)
      }
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
    toBinaryOrNull(entity: Entity): ByteBuffer | null {
      const component = data.get(entity)
      if (!component) {
        return null
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
      buffer: ByteBuffer,
      markAsDirty = true
    ): ComponentType<T> | null {
      const component = data.get(entity)
      if (!component) {
        throw new Error(
          `[updateFromBinary] Component ${componentId} for ${entity} not found`
        )
      }
      return this.upsertFromBinary(entity, buffer, markAsDirty)
    },
    upsertFromBinary(
      entity: Entity,
      buffer: ByteBuffer,
      markAsDirty = true
    ): ComponentType<T> | null {
      const newValue = spec.deserialize(buffer)
      data.set(entity, newValue)
      if (markAsDirty) {
        dirtyIterator.add(entity)
      } else {
        dirtyIterator.delete(entity)
      }
      return newValue
    },
    clearDirty() {
      dirtyIterator.clear()
    }
  }
}
