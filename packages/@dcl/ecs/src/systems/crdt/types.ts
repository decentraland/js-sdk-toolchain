import { Entity } from '../../engine/entity'
import WireMessage from '../../serialization/wireMessage'

export type ReceiveMessage = {
  type: WireMessage.Enum
  entity: Entity
  componentId: number
  timestamp: number
  transportType?: string
  data?: Uint8Array
  messageBuffer: Uint8Array
}

export type TransportMessage = Omit<ReceiveMessage, 'data'>

export type Transport = {
  type: string
  send(message: Uint8Array): void
  onmessage?(message: Uint8Array): void
  filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean
}
