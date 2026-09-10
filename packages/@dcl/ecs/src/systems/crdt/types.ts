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
 * Who a transport attests a chunk of messages came from. Transports that cannot
 * attest to an origin leave it out.
 */
export type TransportSender = {
  address: string
  networkId: number
}

/**
 * @public
 */
export type Transport = {
  /**
   *  For Network messages its an Uint8Array[]. Due too the LiveKit MAX_SIZE = 13kb
   *  For Renderer & Other transports we send a single Uint8Array
   */
  send(message: Uint8Array | Uint8Array[]): Promise<void>
  /**
   * Network messages name their own owner, so without a `sender` the engine has to
   * take that name at face value.
   */
  onmessage?(message: Uint8Array, sender?: TransportSender): void
  filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean
  type?: string
}
