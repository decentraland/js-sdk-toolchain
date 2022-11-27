import { TransportMessage, Transport } from '@dcl/ecs/src/systems/crdt/types'

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

      // TODO: Static entities & Network components

      return !!message // validComponents.includes(componentId)
    }
  }
}
