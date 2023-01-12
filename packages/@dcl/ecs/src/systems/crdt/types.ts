import { CrdtMessageBody } from '../../serialization/crdt/types'

export type ReceiveMessage = CrdtMessageBody & {
  transportId?: number
  messageBuffer: Uint8Array
}

export type TransportMessage = Omit<ReceiveMessage, 'data'>

export type Transport = {
  send(message: Uint8Array): Promise<void>
  onmessage?(message: Uint8Array): void
  filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean
}
