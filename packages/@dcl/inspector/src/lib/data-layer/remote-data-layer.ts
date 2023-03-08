import { initStream } from './logic/stream'
import { createEngine } from './logic/engine'
import { DataLayerInterface } from './types'

export function getLocalDataLayerRpc(): DataLayerInterface {
  const engine = createEngine()

  return {
    async undo() {
      return {}
    },
    // This method receives an incoming message iterator
    // and returns an async iterable. consumption and production of messages
    // are decoupled operations
    stream: initStream(engine)
  }
}
