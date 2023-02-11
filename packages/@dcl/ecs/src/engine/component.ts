import type { ISchema } from '../schemas/ISchema'
import { ByteBuffer, ReadWriteByteBuffer } from '../serialization/ByteBuffer'
import {
  CrdtMessageBody,
  CrdtMessageType,
  DeleteComponentMessageBody,
  ProcessMessageResultType,
  PutComponentMessageBody
} from '../serialization/crdt'
import { dataCompare } from '../systems/crdt/utils'
import { Entity } from './entity'
import { deepReadonly, DeepReadonly } from './readonly'

/**
 * @public
 */
export interface ComponentDefinition<T> {
  readonly componentId: number
  readonly componentName: string

  /**
   * Return the default value of the current component
   */
  default(): DeepReadonly<T>

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
  get(entity: Entity): DeepReadonly<T>

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead), or null if the entity doesn't have the component.
   * @param entity - Entity that will be used to try to get the component
   */
  getOrNull(entity: Entity): DeepReadonly<T> | null

  /**
   * Add the current component to an entity, throw an error if the component already exists (use `createOrReplace` instead).
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create the component
   * @param val - The initial value
   */
  create(entity: Entity, val?: T): T
  /**
   * Add the current component to an entity or replace the content if the entity already has the component
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create or replace the component
   * @param val - The initial or new value
   */
  createOrReplace(entity: Entity, val?: T): T

  /**
   * @internal
   * Delete the current component to an entity, return null if the entity doesn't have the current component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to delete the component from
   * @param markAsDirty - defaults to true
   */
  deleteFrom(entity: Entity, markAsDirty?: boolean): T | null

  /**
   * @public
   * Delete the current component to an entity, return null if the entity doesn't have the current component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to delete the component from
   */
  deleteFrom(entity: Entity): T | null

  /**
   * @public
   * Marks the entity as deleted and signals it cannot be used ever again. It must
   * clear the component internal state, produces a synchronization message to remove
   * the component from the entity.
   * @param entity - Entity to delete the component from
   */
  entityDeleted(entity: Entity, markAsDirty: boolean): void

  /**
   * Get the mutable component of the entity, throw an error if the entity doesn't have the component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to get the component from
   */
  getMutable(entity: Entity): T

  /**
   * Get the mutable component of the entity, return null if the entity doesn't have the component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to get the component from
   */
  getMutableOrNull(entity: Entity): T | null

  /**
   * @internal
   * @param buffer - data to deserialize
   */
  deserialize(buffer: ByteBuffer): T

  /**
   * This function receives a CRDT update and returns a touple with a "conflict
   * resoluton" message, in case of the sender being updated or null in case of noop/accepted
   * change. The second element of the touple is the modified/changed/deleted value.
   * @public
   */
  updateFromCrdt(body: CrdtMessageBody): [null | PutComponentMessageBody | DeleteComponentMessageBody, T | null]

  /**
   * This function returns an iterable with all the CRDT updates that need to be
   * broadcasted to other actors in the system. After returning, this function
   * clears the internal dirty state. Updates are produced only once.
   * @public
   */
  getCrdtUpdates(): Iterable<CrdtMessageBody>

  // allocates a buffer and returns new buffer
  /**
   * @internal
   * @param entity - Entity to serizalie
   */
  toBinary(entity: Entity): ByteBuffer

  // allocates a buffer and returns new buffer if it exists or null

  /**
   * @internal Use engine.getEntitiesWith(Component) instead.
   * Get the iterator to every entity has the component
   */
  iterator(): Iterable<[Entity, T]>

  // Dirty
  /**
   * @internal
   */
  dirtyIterator(): Iterable<Entity>
  /**
   * @internal
   */
  isDirty(entity: Entity): boolean
}

export function incrementTimestamp(entity: Entity, timestamps: Map<Entity, number>): number {
  const newTimestamp = (timestamps.get(entity) || 0) + 1
  timestamps.set(entity, newTimestamp)
  return newTimestamp
}

export function createUpdateFromCrdt(
  componentId: number,
  timestamps: Map<Entity, number>,
  schema: Pick<ISchema<any>, 'serialize' | 'deserialize'>,
  data: Map<Entity, unknown>
) {
  /**
   * Process the received message only if the lamport number recieved is higher
   * than the stored one. If its lower, we spread it to the network to correct the peer.
   * If they are equal, the bigger raw data wins.

    * Returns the recieved data if the lamport number was bigger than ours.
    * If it was an outdated message, then we return void
    * @public
    */
  function crdtRuleForCurrentState(
    message: PutComponentMessageBody | DeleteComponentMessageBody
  ): ProcessMessageResultType {
    const { entityId, timestamp } = message
    const currentTimestamp = timestamps.get(entityId as Entity)

    // The received message is > than our current value, update our state.components.
    if (currentTimestamp === undefined || currentTimestamp < timestamp) {
      return ProcessMessageResultType.StateUpdatedTimestamp
    }

    // Outdated Message. Resend our state message through the wire.
    if (currentTimestamp > timestamp) {
      // console.log('2', currentTimestamp, timestamp)
      return ProcessMessageResultType.StateOutdatedTimestamp
    }

    // Deletes are idempotent
    if (message.type === CrdtMessageType.DELETE_COMPONENT && !data.has(entityId)) {
      return ProcessMessageResultType.NoChanges
    }

    let currentDataGreater = 0

    if (data.has(entityId)) {
      const writeBuffer = new ReadWriteByteBuffer()
      schema.serialize(data.get(entityId)!, writeBuffer)
      currentDataGreater = dataCompare(writeBuffer.toBinary(), (message as any).data || null)
    } else {
      currentDataGreater = dataCompare(null, (message as any).data)
    }

    // Same data, same timestamp. Weirdo echo message.
    // console.log('3', currentDataGreater, writeBuffer.toBinary(), (message as any).data || null)
    if (currentDataGreater === 0) {
      return ProcessMessageResultType.NoChanges
    } else if (currentDataGreater > 0) {
      // Current data is greater
      return ProcessMessageResultType.StateOutdatedData
    } else {
      // Curent data is lower
      return ProcessMessageResultType.StateUpdatedData
    }
  }

  return (msg: CrdtMessageBody): [null | PutComponentMessageBody | DeleteComponentMessageBody, any] => {
    /* istanbul ignore next */
    if (msg.type !== CrdtMessageType.PUT_COMPONENT && msg.type !== CrdtMessageType.DELETE_COMPONENT)
      /* istanbul ignore next */
      return [null, data.get(msg.entityId)]

    const action = crdtRuleForCurrentState(msg)
    const entity = msg.entityId as Entity
    switch (action) {
      case ProcessMessageResultType.StateUpdatedData:
      case ProcessMessageResultType.StateUpdatedTimestamp: {
        timestamps.set(entity, msg.timestamp)

        if (msg.type === CrdtMessageType.PUT_COMPONENT) {
          const buf = new ReadWriteByteBuffer(msg.data!)
          data.set(entity, schema.deserialize(buf))
        } else {
          data.delete(entity)
        }

        return [null, data.get(entity)]
      }
      case ProcessMessageResultType.StateOutdatedTimestamp:
      case ProcessMessageResultType.StateOutdatedData: {
        if (data.has(entity)) {
          const writeBuffer = new ReadWriteByteBuffer()
          schema.serialize(data.get(entity)!, writeBuffer)

          return [
            {
              type: CrdtMessageType.PUT_COMPONENT,
              componentId,
              data: writeBuffer.toBinary(),
              entityId: entity,
              timestamp: timestamps.get(entity)!
            } as PutComponentMessageBody,
            data.get(entity)
          ]
        } else {
          return [
            {
              type: CrdtMessageType.DELETE_COMPONENT,
              componentId,
              entityId: entity,
              timestamp: timestamps.get(entity)!
            } as DeleteComponentMessageBody,
            undefined
          ]
        }
      }
    }

    return [null, data.get(entity)]
  }
}

export function createGetCrdtMessages(
  componentId: number,
  timestamps: Map<Entity, number>,
  dirtyIterator: Set<Entity>,
  schema: Pick<ISchema<any>, 'serialize'>,
  data: Map<Entity, unknown>
) {
  return function* () {
    for (const entity of dirtyIterator) {
      const newTimestamp = incrementTimestamp(entity, timestamps)
      if (data.has(entity)) {
        const writeBuffer = new ReadWriteByteBuffer()
        schema.serialize(data.get(entity)!, writeBuffer)

        const msg: PutComponentMessageBody = {
          type: CrdtMessageType.PUT_COMPONENT,
          componentId,
          entityId: entity,
          data: writeBuffer.toBinary(),
          timestamp: newTimestamp
        }

        yield msg
      } else {
        const msg: DeleteComponentMessageBody = {
          type: CrdtMessageType.DELETE_COMPONENT,
          componentId,
          entityId: entity,
          timestamp: newTimestamp
        }

        yield msg
      }
    }
    dirtyIterator.clear()
  }
}

/**
 * @internal
 */
export function createComponentDefinitionFromSchema<T>(
  componentName: string,
  componentId: number,
  schema: ISchema<T>
): ComponentDefinition<T> {
  const data = new Map<Entity, T>()
  const dirtyIterator = new Set<Entity>()
  const timestamps = new Map<Entity, number>()

  return {
    get componentId() {
      return componentId
    },
    get componentName() {
      return componentName
    },
    default() {
      return schema.create() as DeepReadonly<T>
    },
    isDirty(entity: Entity): boolean {
      return dirtyIterator.has(entity)
    },
    has(entity: Entity): boolean {
      return data.has(entity)
    },
    deleteFrom(entity: Entity, markAsDirty = true): T | null {
      const component = data.get(entity)
      if (data.delete(entity) && markAsDirty) {
        dirtyIterator.add(entity)
      }
      return component || null
    },
    entityDeleted(entity: Entity, markAsDirty: boolean): void {
      if (data.delete(entity) && markAsDirty) {
        dirtyIterator.add(entity)
      }
    },
    getOrNull(entity: Entity): DeepReadonly<T> | null {
      const component = data.get(entity)
      return component ? deepReadonly(component) : null
    },
    get(entity: Entity): DeepReadonly<T> {
      const component = data.get(entity)
      if (!component) {
        throw new Error(`[getFrom] Component ${componentName} for entity #${entity} not found`)
      }
      return deepReadonly(component)
    },
    create(entity: Entity, value?: T): T {
      const component = data.get(entity)
      if (component) {
        throw new Error(`[create] Component ${componentName} for ${entity} already exists`)
      }
      const usedValue = value === undefined ? schema.create() : schema.extend ? schema.extend(value) : value
      data.set(entity, usedValue)
      dirtyIterator.add(entity)
      return usedValue
    },
    createOrReplace(entity: Entity, value?: T): T {
      const usedValue = value === undefined ? schema.create() : schema.extend ? schema.extend(value) : value
      data.set(entity, usedValue!)
      dirtyIterator.add(entity)
      return usedValue!
    },
    getMutableOrNull(entity: Entity): T | null {
      const component = data.get(entity)
      if (!component) {
        return null
      }
      dirtyIterator.add(entity)
      return component
    },
    getMutable(entity: Entity): T {
      const component = this.getMutableOrNull(entity)
      if (component === null) {
        throw new Error(`[mutable] Component ${componentName} for ${entity} not found`)
      }
      return component
    },
    *iterator(): Iterable<[Entity, T]> {
      for (const [entity, component] of data) {
        yield [entity, component]
      }
    },
    *dirtyIterator(): Iterable<Entity> {
      for (const entity of dirtyIterator) {
        yield entity
      }
    },
    getCrdtUpdates: createGetCrdtMessages(componentId, timestamps, dirtyIterator, schema, data),
    toBinary(entity: Entity): ByteBuffer {
      const component = data.get(entity)
      if (!component) {
        throw new Error(`[toBinary] Component ${componentName} for ${entity} not found`)
      }

      const writeBuffer = new ReadWriteByteBuffer()
      schema.serialize(component, writeBuffer)
      return writeBuffer
    },
    updateFromCrdt: createUpdateFromCrdt(componentId, timestamps, schema, data),
    deserialize(buffer: ByteBuffer): T {
      return schema.deserialize(buffer)
    }
  }
}
