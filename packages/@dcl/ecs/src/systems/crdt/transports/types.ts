import { TransportMessage } from '../types'

export type Transport = {
  type: string
  send(message: Uint8Array): void
  onmessage?(message: Uint8Array): void
  filter(message: TransportMessage): boolean
}
