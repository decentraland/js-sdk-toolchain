import { Entity } from '../../engine/entity'
import WireMessage from '../../serialization/wireMessage'

export type ReceiveMessage = {
  type: WireMessage.Enum
  entity: Entity
  componentId: number
  timestamp: number
  transportId?: number
  data?: Uint8Array
  messageBuffer: Uint8Array
}

export type TransportMessage = Omit<ReceiveMessage, 'data'>

export type Transport = {
  send(message: Uint8Array): Promise<void>
  onmessage?(message: Uint8Array): void
  filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean
}
