import { CrdtMessageBody, CrdtNetworkMessageBody } from '../../serialization/crdt/types'

/**
 * @public
 */
export type ReceiveMessage = CrdtMessageBody & {
  transportId?: number
  messageBuffer: Uint8Array
}

/**
 * @public
 */
export type ReceiveNetworkMessage = CrdtNetworkMessageBody & {
  transportId?: number
  messageBuffer: Uint8Array
}

/**
 * @public
 */
export type TransportMessage = Omit<ReceiveMessage, 'data'>

/**
 * @public
 */
export type Transport = {
  /**
   *  For Network messages its an Uint8Array[]. Due too the LiveKit MAX_SIZE = 13kb
   *  For Renderer & Other transports we send a single Uint8Array
   */
  send(message: Uint8Array | Uint8Array[]): Promise<void>
  onmessage?(message: Uint8Array): void
  filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean
  type?: string
}
