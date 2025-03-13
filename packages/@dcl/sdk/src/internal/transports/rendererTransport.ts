import { Transport, TransportMessage } from '@dcl/ecs'
import { MAX_STATIC_COMPONENT } from '@dcl/ecs/dist/components/component-number'
import type { CrdtSendToRendererRequest, CrdtSendToResponse } from '~system/EngineApi'

export type EngineApiRendererInspector =
  | ((data: { message: Uint8Array[]; type: 'send' | 'receive' | 'first-receive' }) => void)
  | undefined

export type EngineApiForTransport = {
  crdtSendToRenderer(body: CrdtSendToRendererRequest): Promise<CrdtSendToResponse>
}

export function createRendererTransport(engineApi: EngineApiForTransport): Transport {
  async function sendToRenderer(message: Uint8Array) {
    const rendererMessageInspector: EngineApiRendererInspector = (globalThis as any).rendererMessageInspector

    if (rendererMessageInspector) {
      rendererMessageInspector({ message: [message], type: 'send' })
    }
    const response = await engineApi.crdtSendToRenderer({
      data: new Uint8Array(message)
    })
    if (response && response.data && response.data.length) {
      if (rendererMessageInspector) {
        rendererMessageInspector({ message: response.data, type: 'receive' })
      }

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
        await sendToRenderer(message as Uint8Array)
      } catch (error) {
        // this is the console.error of the scene
        // eslint-disable-next-line no-console
        console.error(error)
        debugger
      }
    },
    filter(message: TransportMessage) {
      // Only send renderer components (Proto Generated)
      if (
        // filter out messages for non-core components
        (message as any).componentId > MAX_STATIC_COMPONENT
      ) {
        return false
      }
      return !!message
    },
    type: 'renderer'
  }

  return rendererTransport
}
