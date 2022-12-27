import { gset } from './gset'
import { AddGSetMessage, CRDT, LWWMessage, Message, MessageType, Payload, State } from './types'
export * from './types'

const globalBuffer = (globalThis as any).Buffer

/**
 * Compare raw data.
 * @internal
 */
export function sameData<T>(a: T, b: T): boolean {
  // At reference level
  if (a === b) return true

  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.byteLength !== b.byteLength) {
      return false
    }

    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) {
        return false
      }
    }
    return true
  }

  if (globalBuffer) {
    /* istanbul ignore next */
    if (a instanceof globalBuffer && b instanceof globalBuffer) {
      /* istanbul ignore next */
      return (a as any).equals(b)
    }
  }

  return false
}

/**
 * State iterator
 * @internal
 */
export function* stateIterator<T>(
  state: State<T>
): IterableIterator<[number, number, Payload<T> | null]> {
  for (const [componentId, value1] of state.entries()) {
    for (const [entityId, value2] of value1.entries()) {
      yield [componentId, entityId, value2]
    }
  }
}

type EntityUtils = {
  entityVersion(entityId: number): number
  entityNumber(entityId: number): number
  entityId(entityNumber: number, entityVersion: number): number
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
  const state: State<T> = new Map()
  const stateGrowonlySet = gset()

  /**
   * We should call this fn in order to update the state
   * @internal
   */
  function updateState(
    componentId: number,
    entityId: number,
    data: T | null,
    remoteTimestamp: number
  ): Payload<T> {
    const componentIdValue = state.get(componentId)
    const timestamp = Math.max(
      remoteTimestamp,
      componentIdValue?.get(entityId)?.timestamp || 0
    )
    if (componentIdValue) {
      componentIdValue.set(entityId, { timestamp, data })
    } else {
      const componentIdValue = new Map()
      componentIdValue.set(entityId, { timestamp, data })
      state.set(componentId, componentIdValue)
    }
    return { timestamp, data }
  }

  /**
   * Create an event for the specified key and store the new data and
   * lamport timestmap incremented by one in the state.
   * @public
   */
  function createEvent(componentId: number, entityId: number, data: T | null): Message<T> {
    // Increment the timestamp
    const timestamp = (state.get(componentId)?.get(entityId)?.timestamp || 0) + 1
    updateState(componentId, entityId, data, timestamp)

    return { type: MessageType.MT_LWW, componentId, entityId, data, timestamp }
  }

  /**
   * Process the received message only if the lamport number recieved is higher
   * than the stored one. If its lower, we spread it to the network to correct the peer.
   * If they are equal, the bigger raw data wins.

   * Returns the recieved data if the lamport number was bigger than ours.
   * If it was an outdated message, then we return void
   * @public
   */
  function processLWWMessage(message: LWWMessage<T>): Message<T> {
    const n = entityUtils.entityNumber(message.entityId)
    const v = entityUtils.entityNumber(message.entityId)
    if (stateGrowonlySet.has(n, v)) {
      return {
        type: MessageType.MT_AddGSet,
        entityId: message.entityId
      }
    }

    const { componentId, entityId, data, timestamp } = message
    const current = state.get(componentId)?.get(entityId)

    // The received message is > than our current value, update our state.
    if (!current || current.timestamp < timestamp) {
      updateState(componentId, entityId, data, timestamp)
      return message
    }

    // Outdated Message. Resend our state message through the wire.
    if (current.timestamp > timestamp) {
      return {
        type: MessageType.MT_LWW,
        componentId,
        entityId,
        data: current.data,
        timestamp: current.timestamp
      }
    }

    // Same data, same timestamp. Weirdo echo message.
    if (sameData(current.data, data)) {
      return message
    }

    // Race condition, same timestamp diff data.
    function compareData(current: T | null, data: T | null) {
      // Null value wins
      return !current || current! > data!
    }

    if (compareData(current.data, data)) {
      return {
        type: MessageType.MT_LWW,
        componentId,
        entityId,
        data: current.data,
        timestamp: current.timestamp
      }
    }
    updateState(componentId, entityId, data, timestamp).data
    return message
  }

  /*
  * @public
  */
  function processMessage(message: Message<T>): Message<T> {
    if (message.type === MessageType.MT_LWW) {
      return processLWWMessage(message as LWWMessage<T>)
    } else {
      return processAddSetMessage(message as AddGSetMessage)
    }
  }

  function processAddSetMessage(message: AddGSetMessage): AddGSetMessage {
    const { entityId } = message
    stateGrowonlySet.addTo(entityUtils.entityNumber(entityId), entityUtils.entityVersion(entityId))

    for (const [, payload] of state) {
      payload.delete(entityId)
    }

    return {
      type: MessageType.MT_AddGSet,
      entityId
    }
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
    return state.get(componentId)?.get(entityId) || null
  }

  return {
    getElementSetState,
    createEvent,
    processMessage,
    getState
  }
}
