import { IEntity } from '../../engine/entity'
import WireMessage from '../../serialization/wireMessage'

export type ReceiveMessage = {
  type: WireMessage.Enum
  entity: IEntity
  componentId: number
  timestamp: number
  transportType?: string
  data?: Uint8Array
  messageBuffer: Uint8Array
}

export type TransportMessage = Omit<ReceiveMessage, 'data'>
