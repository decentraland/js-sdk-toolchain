/**
 * Struct of the message that's being transfered between clients.
 * @public
 */
export type Message<T = unknown> = {
  key1: number
  key2: number
  timestamp: number
  data: T | null
}

/**
 * Payload that its being stored in the state.
 * @public
 */
export type Payload<T = unknown> = {
  timestamp: number
  data: T | null
}

/**
 * Local state
 * @public
 */
export type State<T = unknown> = Map<number, Map<number, Payload<T> | null>>

/**
 * CRDT return type
 * @public
 */
export type CRDT<T = unknown> = {
  createEvent(key1: number, key2: number, data: T | null): Message<T>
  processMessage(message: Message<T>): Message<T>
  // @internal
  getState(): State<T>
  getElementSetState(key1: number, key2: number): Payload<T> | null
}
