/** @alpha THIS FILE INITIALIZES THE DECENTRALAND RUNTIME. WILL CHANGE SOON */

import { engine } from '@dcl/ecs'
import { pollEvents, setSubscribeFunction } from './observables'
import {
  subscribe,
  sendBatch,
  crdtSendToRenderer,
  crdtGetState
} from '~system/EngineApi'
import { createRendererTransport } from './internal/transports/rendererTransport'

// Attach CRDT transport
const rendererTransport = createRendererTransport({ crdtSendToRenderer })
engine.addTransport(rendererTransport)

// attach engineApi.subscribe function for events. This is only a transition
// patch until events are completely migrated to CRDT messages
setSubscribeFunction(subscribe)

export async function onUpdate(deltaTime: number) {
  await engine.update(deltaTime)
  await pollEvents(sendBatch)
}

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
