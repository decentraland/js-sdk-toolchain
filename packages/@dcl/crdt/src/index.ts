import { CRDT, Message, Payload, State } from './types'
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
    if (a instanceof globalBuffer && b instanceof globalBuffer) {
      // Deep level
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
  for (const [key1, value1] of state.entries()) {
    for (const [key2, value2] of value1.entries()) {
      yield [key1, key2, value2]
    }
  }
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
>(): CRDT<T> {
  /**
   * Local state where we store the latest lamport timestamp
   * and the raw data value
   * @internal
   */
  const state: State<T> = new Map()

  /**
   * We should call this fn in order to update the state
   * @internal
   */
  function updateState(
    key1: number,
    key2: number,
    data: T | null,
    remoteTimestamp: number
  ): Payload<T> {
    const key1Value = state.get(key1)
    const timestamp = Math.max(
      remoteTimestamp,
      key1Value?.get(key2)?.timestamp || 0
    )
    if (key1Value) {
      key1Value.set(key2, { timestamp, data })
    } else {
      const newKey1Value = new Map()
      newKey1Value.set(key2, { timestamp, data })
      state.set(key1, newKey1Value)
    }
    return { timestamp, data }
  }

  /**
   * Create an event for the specified key and store the new data and
   * lamport timestmap incremented by one in the state.
   * @public
   */
  function createEvent(key1: number, key2: number, data: T | null): Message<T> {
    // Increment the timestamp
    const timestamp = (state.get(key1)?.get(key2)?.timestamp || 0) + 1
    updateState(key1, key2, data, timestamp)

    return { key1, key2, data, timestamp }
  }

  /**
   * Process the received message only if the lamport number recieved is higher
   * than the stored one. If its lower, we spread it to the network to correct the peer.
   * If they are equal, the bigger raw data wins.

   * Returns the recieved data if the lamport number was bigger than ours.
   * If it was an outdated message, then we return void
   * @public
   */
  function processMessage(message: Message<T>): Message<T> {
    const { key1, key2, data, timestamp } = message
    const current = state.get(key1)?.get(key2)

    // The received message is > than our current value, update our state.
    if (!current || current.timestamp < timestamp) {
      updateState(key1, key2, data, timestamp)
      return message
    }

    // Outdated Message. Resend our state message through the wire.
    if (current.timestamp > timestamp) {
      return {
        key1,
        key2,
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
      return current! > data!
    }

    if (compareData(current.data, data)) {
      return {
        key1,
        key2,
        data: current.data,
        timestamp: current.timestamp
      }
    }
    updateState(key1, key2, data, timestamp).data
    return message
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
  function getElementSetState(key1: number, key2: number): Payload<T> | null {
    return state.get(key1)?.get(key2) || null
  }

  return {
    getElementSetState,
    createEvent,
    processMessage,
    getState
  }
}
