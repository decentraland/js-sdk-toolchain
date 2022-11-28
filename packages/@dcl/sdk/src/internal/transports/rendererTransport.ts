import { Transport, TransportMessage } from '@dcl/ecs'
import { ECSComponentIDs } from '@dcl/ecs/dist/components/generated/ids.gen'
import type {
  CrdtSendToRendererRequest,
  CrdtSendToResponse
} from '~system/EngineApi'

const componentIds = Object.values(ECSComponentIDs)
  .filter((a) => typeof a === 'number')
  .map(Number)

export type EngineApiForTransport = {
  crdtSendToRenderer(
    body: CrdtSendToRendererRequest
  ): Promise<CrdtSendToResponse>
}

export function createRendererTransport(
  engineApi: EngineApiForTransport
): Transport {
  async function sendToRenderer(message: Uint8Array) {
    const response = await engineApi.crdtSendToRenderer({
      data: new Uint8Array(message)
    })

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
      sendToRenderer(message).catch((error) => {
        console.error(error)
        debugger
      })
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
