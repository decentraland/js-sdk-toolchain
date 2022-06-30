import { TransportMessage } from '../types'
import { Transport } from './types'

export function createNetworkTransport(): Transport {
  // const rpc = new RpcTransport()
  function send(..._args: any[]) {
    // console.log('NetworkMessage Sent: ', ...args)
  }

  const type = 'network-transport'
  return {
    send,
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
