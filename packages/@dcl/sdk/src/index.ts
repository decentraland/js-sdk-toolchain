/** @alpha THIS FILE INITIALIZES THE DECENTRALAND RUNTIME. WILL CHANGE SOON */
import { engine } from '@dcl/ecs'
import { pollEvents } from './observables'
import { sendBatch, crdtSendToRenderer, crdtGetState } from '~system/EngineApi'
import { createRendererTransport } from './internal/transports/rendererTransport'

// Attach CRDT transport
const rendererTransport = createRendererTransport({ crdtSendToRenderer })
engine.addTransport(rendererTransport)

export async function onUpdate(deltaTime: number) {
  await engine.update(deltaTime)
  await pollEvents(sendBatch)
}

/**
 * @internal
 * Function that is called before the first update and after the evaluation of the code.
 */
export async function onStart() {
  await engine.seal()

  const response = await crdtGetState({ data: new Uint8Array() })
  if (!!rendererTransport.onmessage) {
    if (response && response.data && response.data.length) {
      for (const byteArray of response.data) {
        rendererTransport.onmessage(byteArray)
      }
    }
  }
}
