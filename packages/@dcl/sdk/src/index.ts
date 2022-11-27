/** @alpha THIS FILE INITIALIZES THE DECENTRALAND RUNTIME. WILL CHANGE SOON */

import { engine } from '@dcl/ecs'
import { pollEvents, setSubscribeFunction } from './observables'
import { subscribe, sendBatch, crdtSendToRenderer } from '~system/EngineApi'
import { createRendererTransport } from './transports/rendererTransport'

// Attach CRDT transport
engine.addTransport(createRendererTransport({ crdtSendToRenderer }))

// attach engineApi.subscribe function for events. This is only a transition
// patch until events are completely migrated to CRDT messages
setSubscribeFunction(subscribe)

export async function onUpdate(deltaTime: number) {
  engine.update(deltaTime)
  await pollEvents(sendBatch)
}

console
