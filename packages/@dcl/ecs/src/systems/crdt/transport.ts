import { TransportMessage } from './types'

export type Transport = {
  type: string
  send(message: Uint8Array): void
  onmessage?(message: MessageEvent<Uint8Array>): void
  filter(message: TransportMessage): boolean
}

function networkTransport(): Transport {
  // const rpc = new RpcTransport()
  const rpc = {
    send: () => {}
  }

  const type = 'network-transport'
  return {
    ...rpc,
    type,
    filter(message: TransportMessage): boolean {
      // Echo message, ignore them
      if (message.transportType === type) {
        return false
      }

      return !!message // validComponents.includes(componentId)
    }
  }
}

export function getTransports() {
  return [networkTransport()]
}
