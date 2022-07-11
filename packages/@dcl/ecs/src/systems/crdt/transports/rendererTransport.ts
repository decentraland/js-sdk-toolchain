import { TransportMessage } from '../types'
import { Transport } from './types'
import { ComponentIds } from '../../../components/generated/index.gen'
import { LEGACY_COMPONENT_ID } from '../../../components/legacy/types'

const componentIds = Object.values(ComponentIds)
  .filter((a) => typeof a === 'number')
  .map(Number)
const rendererComponentIds = componentIds.concat(LEGACY_COMPONENT_ID.TRANSFORM)

export function createRendererTransport(): Transport {
  const type = 'renderer'
  return {
    type,
    send(message: Uint8Array): void {
      // TODO: replace with new rpc
      dcl
        .callRpc('@decentraland/ExperimentalAPI', 'sendToRenderer', [
          { data: new Uint8Array(message) }
        ])
        .catch(dcl.error)
    },
    filter(message: TransportMessage): boolean {
      // Echo message, ignore them
      if (message.transportType === type) {
        return false
      }

      // Only send renderer components (Proto Generated)
      if (!rendererComponentIds.includes(message.componentId)) {
        return false
      }

      return !!message
    }
  }
}
