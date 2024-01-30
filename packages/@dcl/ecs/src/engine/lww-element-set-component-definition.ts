import { ISchema } from '../schemas'
import { ByteBuffer, ReadWriteByteBuffer } from '../serialization/ByteBuffer'
import {
  PutComponentMessageBody,
  DeleteComponentMessageBody,
  ProcessMessageResultType,
  CrdtMessageType,
  CrdtMessageBody,
  PutComponentOperation,
  DeleteComponent,
  PutNetworkComponentMessageBody,
  DeleteComponentNetworkMessageBody
} from '../serialization/crdt'
import { dataCompare } from '../systems/crdt/utils'
import { LastWriteWinElementSetComponentDefinition, ComponentType } from './component'
import { Entity } from './entity'
import { DeepReadonly, deepReadonly } from './readonly'

export function incrementTimestamp(entity: Entity, timestamps: Map<Entity, number>): number {
  const newTimestamp = (timestamps.get(entity) || 0) + 1
  timestamps.set(entity, newTimestamp)
  return newTimestamp
}

export function createDumpLwwFunctionFromCrdt(
  componentId: number,
  timestamps: Map<Entity, number>,
  schema: Pick<ISchema<any>, 'serialize' | 'deserialize'>,
  data: Map<Entity, unknown>
) {
  return function dumpCrdtState(buffer: ByteBuffer, filterEntity?: (entity: Entity) => boolean) {
    for (const [entity, timestamp] of timestamps) {
      /* istanbul ignore if */
      if (filterEntity) {
        // I swear that this is being tested on state-to-crdt.spec but jest is trolling me
        /* istanbul ignore next */
        if (!filterEntity(entity)) continue
      }
      /* istanbul ignore else */
      if (data.has(entity)) {
        const it = data.get(entity)!
        const buf = new ReadWriteByteBuffer()
        schema.serialize(it, buf)
        PutComponentOperation.write(entity, timestamp, componentId, buf.toBinary(), buffer)
      } else {
        DeleteComponent.write(entity, componentId, timestamp, buffer)
      }
    }
  }
}

export function createUpdateLwwFromCrdt(
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
    message:
      | PutComponentMessageBody
      | DeleteComponentMessageBody
      | PutNetworkComponentMessageBody
      | DeleteComponentNetworkMessageBody
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
    if (
      msg.type !== CrdtMessageType.PUT_COMPONENT &&
      msg.type !== CrdtMessageType.PUT_COMPONENT_NETWORK &&
      msg.type !== CrdtMessageType.DELETE_COMPONENT &&
      msg.type !== CrdtMessageType.DELETE_COMPONENT_NETWORK
    )
      /* istanbul ignore next */
      return [null, data.get(msg.entityId)]

    const action = crdtRuleForCurrentState(msg)
    const entity = msg.entityId as Entity
    switch (action) {
      case ProcessMessageResultType.StateUpdatedData:
      case ProcessMessageResultType.StateUpdatedTimestamp: {
        timestamps.set(entity, msg.timestamp)

        if (msg.type === CrdtMessageType.PUT_COMPONENT || msg.type === CrdtMessageType.PUT_COMPONENT_NETWORK) {
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

export function createGetCrdtMessagesForLww(
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
): LastWriteWinElementSetComponentDefinition<T> {
  const data = new Map<Entity, T>()
  const dirtyIterator = new Set<Entity>()
  const timestamps = new Map<Entity, number>()
  const onChangeCallbacks = new Map<Entity, (data: T | undefined) => void>()

  return {
    get componentId() {
      return componentId
    },
    get componentName() {
      return componentName
    },
    get componentType() {
      // a getter is used here to prevent accidental changes
      return ComponentType.LastWriteWinElementSet as const
    },
    schema,
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
      const usedValue =
        value === undefined ? schema.create() : schema.extend ? schema.extend(value as DeepReadonly<T>) : value
      data.set(entity, usedValue)
      dirtyIterator.add(entity)
      return usedValue
    },
    createOrReplace(entity: Entity, value?: T): T {
      const usedValue =
        value === undefined ? schema.create() : schema.extend ? schema.extend(value as DeepReadonly<T>) : value
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
    getOrCreateMutable(entity: Entity, value?: T): T {
      const component = data.get(entity)
      if (!component) {
        return this.create(entity, value)
      } else {
        dirtyIterator.add(entity)
        return component
      }
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
    getCrdtUpdates: createGetCrdtMessagesForLww(componentId, timestamps, dirtyIterator, schema, data),
    updateFromCrdt: createUpdateLwwFromCrdt(componentId, timestamps, schema, data),
    dumpCrdtStateToBuffer: createDumpLwwFunctionFromCrdt(componentId, timestamps, schema, data),
    onChange(entity, cb) {
      onChangeCallbacks.set(entity, cb)
    },
    __onChangeCallbacks(entity) {
      return onChangeCallbacks.get(entity)
    }
  }
}
