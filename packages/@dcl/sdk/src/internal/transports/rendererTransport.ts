import { Transport, TransportMessage, WireMessageEnum } from '@dcl/ecs'
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

  const rendererTransport: Transport = {
    async send(message) {
      try {
        await sendToRenderer(message)
      } catch (error) {
        console.error(error)
        debugger
      }
    },
    filter(message: TransportMessage) {
      // Only send renderer components (Proto Generated)
      if ((message.type === WireMessageEnum.PUT_COMPONENT ||
        message.type === WireMessageEnum.DELETE_COMPONENT) &&
        !componentIds.includes((message as any).componentId)) {
        return false
      }

      return !!message
    }
  }

  return rendererTransport
}
