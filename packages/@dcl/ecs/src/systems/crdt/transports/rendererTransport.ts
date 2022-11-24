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

  async function sendToRenderer(message: Uint8Array) {
    const response = await dcl.callRpc(
      '~system/EngineApi',
      'crdtSendToRenderer',
      [{ data: new Uint8Array(message) }]
    )

    if (response && response.data && response.data.length) {
      if (rendererTransport.onmessage) {
        for (const byteArray of response.data) {
          rendererTransport.onmessage(byteArray)
        }
      }
    }
  }

  const type = 'renderer'
  const rendererTransport: Transport = {
    type,
    send(message: Uint8Array): void {
      sendToRenderer(message).catch(dcl.error)
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

  return rendererTransport
}
