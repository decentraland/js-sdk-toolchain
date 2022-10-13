import { TransportMessage } from '../types'
import { Transport } from './types'
import { ECSComponentIDs } from '../../../components/generated/ids.gen'

const componentIds = Object.values(ECSComponentIDs)
  .filter((a) => typeof a === 'number')
  .map(Number)

export function createRendererTransport(): Transport {
  if (typeof dcl === 'undefined') {
    // TODO: replace with new rpc
    throw new Error(
      'Cannot create createRendererTransport without global dcl object'
    )
  }

  const type = 'renderer'
  return {
    type,
    send(message: Uint8Array): void {
      // TODO: replace with new rpc
      dcl
        .callRpc('~system/ExperimentalApi', 'sendToRenderer', [
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
      if (!componentIds.includes(message.componentId)) {
        return false
      }

      return !!message
    }
  }
}
