import { TransportMessage } from '../types'
import { Transport } from './types'
import { ComponentIds } from '../../../components/generated/index.gen'

export function createRendererTransport(): Transport {
  const type = 'renderer'
  return {
    type,
    send(message: Uint8Array): void {
      // TODO: replace with new rpc
      dcl
        .callRpc('@decentraland/ExperimentalAPI', 'sendToRenderer', [
          { data: message }
        ])
        .catch(dcl.error)
    },
    filter(message: TransportMessage): boolean {
      // Echo message, ignore them
      if (message.transportType === type) {
        return false
      }

      // Only send renderer components (Proto Generated)
      if (!Object.values(ComponentIds).includes(message.componentId)) {
        return false
      }

      return !!message
    }
  }
}
