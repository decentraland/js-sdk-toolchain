import { createGSet } from "./gset"
import { ComponentDataMessage, CRDT, CRDTMessage, CRDTMessageType, DeleteEntityMessage, Payload, ProcessMessageResultType, State } from "./types"

const globalBuffer = (globalThis as any).Buffer

export * from './types'

/**
 * Compare raw data.
 * @internal
 * @returns 0 if is the same data, 1 if a > b, -1 if b > a
 */
export function dataCompare<T>(a: T, b: T): number {
  // At reference level
  if (a === b) return 0
  if (a === null && b !== null) return -1
  if (a !== null && b === null) return 1

  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    const n = a.byteLength > b.byteLength ? b.byteLength : a.byteLength
    for (let i = 0; i < n; i++) {
      const res = a[i] - b[i]
      if (res !== 0) {
        return Math.sign(res)
      }
    }
    return Math.sign(a.byteLength - b.byteLength)
  }

  if (globalBuffer) {
    /* istanbul ignore next */
    if (a instanceof globalBuffer && b instanceof globalBuffer) {
      /* istanbul ignore next */
      return (a as any).compare(b)
    }
  }

  if (typeof a === 'string') {
    return a.localeCompare(b as string)
  }

  return a > b ? 1 : b > a ? -1 : 0
}

/**
 * State iterator
 * @internal
 */
export function* stateIterator<T>(
  state: State<T>
): IterableIterator<[number, number, Payload<T> | null]> {
  for (const [componentId, value1] of state.components.entries()) {
    for (const [entityId, value2] of value1.entries()) {
      yield [componentId, entityId, value2]
    }
  }
}

export type EntityUtils = {
  /**
   * Convert from entityId to the tuple [entityNumber, entityVersion]
   * @param entityId compound number entityId
   */
  fromEntityId(entityId: number): [number, number]

  /**
   * Convert tuple [entityNumber, entityVersion] to entityId compound number
   * @param entityNumber number part
   * @param entityVersion version part
   */
  toEntityId(entityNumber: number, entityVersion: number): number
}

/**
 * @public
 * CRDT protocol.
 * Stores the latest state, and decides whenever we have
 * to process and store the new data in case its an update, or
 * to discard and send our local value cause remote it's outdated.
 */
export function crdtProtocol<
  T extends number | Uint8Array | string
>(entityUtils: EntityUtils): CRDT<T> {
  /**
   * Local state where we store the latest lamport timestamp
   * and the raw data value
   * @internal
   */
  const state: State<T> = {
    components: new Map(),
    deletedEntities: createGSet()
  }

  /**
   * We should call this fn in order to update the state
   * @internal
   */
  function updateState(
    componentId: number,
    entityId: number, // todo: force type entity 
    data: T | null,
    remoteTimestamp: number
  ): Payload<T> {
    const componentIdValue = state.components.get(componentId)
    const timestamp = Math.max(
      remoteTimestamp,
      componentIdValue?.get(entityId)?.timestamp || 0
    )
    if (componentIdValue) {
      componentIdValue.set(entityId, { timestamp, data })
    } else {
      const componentIdValue = new Map()
      componentIdValue.set(entityId, { timestamp, data })
      state.components.set(componentId, componentIdValue)
    }
    return { timestamp, data }
  }

  /**
   * Create an event for the specified key and store the new data and
   * lamport timestmap incremented by one in the state.components.
   * @public
   */
  function createComponentDataEvent(componentId: number, entityId: number, data: T | null): ComponentDataMessage<T> {
    // Increment the timestamp
    const timestamp = (state.components.get(componentId)?.get(entityId)?.timestamp || 0) + 1
    updateState(componentId, entityId, data, timestamp)

    return { type: CRDTMessageType.CRDTMT_PutComponentData, componentId, entityId, data, timestamp }
  }

  /**
   * Create an event for the specified key and store the new data and
   * lamport timestmap incremented by one in the state.components.
   * @public
   */
  function createDeleteEntityEvent(entityId: number): DeleteEntityMessage {
    // Increment the timestamp
    const message: DeleteEntityMessage = {
      type: CRDTMessageType.CRDTMT_DeleteEntity,
      entityId
    }

    processDeleteEntityMessage(message)
    return message
  }

  /**
   * Process the received message only if the lamport number recieved is higher
   * than the stored one. If its lower, we spread it to the network to correct the peer.
   * If they are equal, the bigger raw data wins.

   * Returns the recieved data if the lamport number was bigger than ours.
   * If it was an outdated message, then we return void
   * @public
   */
  function processComponentDataMessage(message: ComponentDataMessage<T>): ProcessMessageResultType {
    const [entityNumber, entityVersion] = entityUtils.fromEntityId(message.entityId)
    if (state.deletedEntities.has(entityNumber, entityVersion)) {
      return ProcessMessageResultType.EntityWasDeleted
    }

    const { componentId, entityId, data, timestamp } = message
    const current = state.components.get(componentId)?.get(entityId)

    // The received message is > than our current value, update our state.components.
    if (!current || current.timestamp < timestamp) {
      updateState(componentId, entityId, data, timestamp)
      return ProcessMessageResultType.StateUpdatedTimestamp
    }

    // Outdated Message. Resend our state message through the wire.
    if (current.timestamp > timestamp) {
      return ProcessMessageResultType.StateOutdatedData
    }

    const currentDataGreater = dataCompare(current.data, data)

    // Same data, same timestamp. Weirdo echo message.
    if (currentDataGreater === 0) {
      return ProcessMessageResultType.NoChanges

      // Current data is greater
    } else if (currentDataGreater > 0) {
      return ProcessMessageResultType.StateOutdatedData

      // Curent data is lower
    } else {
      updateState(componentId, entityId, data, timestamp)
      return ProcessMessageResultType.StateUpdatedData
    }

  }

  /*
  * @public
  */
  function processMessage(message: CRDTMessage<T>): ProcessMessageResultType {
    if (message.type === CRDTMessageType.CRDTMT_PutComponentData) {
      return processComponentDataMessage(message as ComponentDataMessage<T>)
    } else if (message.type === CRDTMessageType.CRDTMT_DeleteEntity) {
      return processDeleteEntityMessage(message as DeleteEntityMessage)
    } else {
      return ProcessMessageResultType.NoChanges
    }
  }

  function processDeleteEntityMessage(message: DeleteEntityMessage): ProcessMessageResultType {
    const { entityId } = message
    const [entityNumber, entityVersion] = entityUtils.fromEntityId(message.entityId)

    state.deletedEntities.addTo(
      entityNumber,
      entityVersion
    )

    for (const [, payload] of state.components) {
      payload.delete(entityId)
    }

    return ProcessMessageResultType.EntityDeleted
  }



  /**
   * Returns the current state
   * @public
   */
  function getState(): State<T> {
    return state
  }

  /**
   * Returns the element state of a given element of the LWW-ElementSet
   * @public
   */
  function getElementSetState(componentId: number, entityId: number): Payload<T> | null {
    return state.components.get(componentId)?.get(entityId) || null
  }

  return {
    getElementSetState,
    createComponentDataEvent,
    createDeleteEntityEvent,
    processMessage,
    getState
  }
}
