import { stream } from './logic/stream'
import { createEngine } from './logic/engine'
import { DataLayerInterface, Fs } from './types'

/**
 * used in sdk-commands to attach the methods to the rpc server
 */
export function createRemoteDataLayer(_fs: Fs): DataLayerInterface {
  console.log('CreateRemoteDataLayer')
  const engine = createEngine()

  return {
    async undo() {
      return {}
    },
    // This method receives an incoming message iterator
    // and returns an async iterable. consumption and production of messages
    // are decoupled operations
    stream: function (iter) {
      return stream(iter, { engine })
    }
  }
}
