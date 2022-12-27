export enum MessageType {
  MT_LWW = 1,
  MT_AddGSet
}

/**
 * Struct of the message that's being transfered between clients.
 * @public
 */
export type LWWMessage<T = unknown> = {
  type: MessageType.MT_LWW,
  componentId: number
  entityId: number
  timestamp: number
  data: T | null
}

export type AddGSetMessage = {
  type: MessageType.MT_AddGSet,
  entityId: number
}

export type Message<T = unknown> = LWWMessage<T> | AddGSetMessage

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
  createEvent(componentId: number, entityId: number, data: T | null): Message<T>
  processMessage(message: Message<T>): Message<T>
  // @internal
  getState(): State<T>
  getElementSetState(componentId: number, entityId: number): Payload<T> | null
}
