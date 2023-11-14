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
  send(message: Uint8Array): Promise<void>
  onmessage?(message: Uint8Array): void
  filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean
  type?: string
}
